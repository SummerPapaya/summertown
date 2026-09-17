import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Heart, Images, X } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { prettyDate, seededRandom } from '@/lib/apple';
import { getDeviceId } from '@/lib/deviceId';
import { useLanguage } from '@/lib/i18n';
import { usePauseSmoothScroll } from '@/lib/smoothScroll';
import { useTown } from '@/lib/town';
import { cn } from '@/lib/utils';

/** Shape of one row returned by town.listApplePhotos.
 * Images/videos live in R2; the row carries public URLs (`/photos/...`
 * or an R2 custom domain), not base64 payloads. */
interface ApplePhotoData {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  imageUrl: string;
  /** ~400 px copy for grids. Null for hand-uploaded photos — callers must
   * fall back to `imageUrl`. */
  thumbUrl: string | null;
  videoUrl: string | null;
}

const APPLE_RED = '#E8563F';

/** Pale pine plank wall for the gallery board — light warm overlay so polaroids pop. */
const WOOD_BOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255, 247, 231, 0.58), rgba(255, 240, 216, 0.46)), url('/tex-wood.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

/** Cream handmade paper for the calendar journal — stronger overlay keeps cells readable. */
const PAPER_JOURNAL_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255, 252, 244, 0.8), rgba(255, 250, 238, 0.76)), url('/tex-paper.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

/** Localized pretty date: month name + template from the dictionary. */
function usePrettyDate() {
  const { t } = useLanguage();
  return (date: string) => {
    const m = Number(date.split('-')[1]);
    return prettyDate(date, t(`apple.months.${m - 1}`), t('apple.datePretty'));
  };
}

/** Local today as YYYY-MM-DD (no UTC shift). */
function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ------------------------------------------------------------------ */
/* Likes                                                               */
/* ------------------------------------------------------------------ */

/** What the like button needs from the page. Kept as one object so the
 * calendar, the polaroid board and the zoom modal all render the same
 * state without each owning a copy. */
export interface LikeApi {
  isLiked: (photoId: number) => boolean;
  countOf: (photoId: number) => number;
  isPending: (photoId: number) => boolean;
  like: (photoId: number) => void;
}

/** Three little hearts that drift up and fade — fired the moment a like
 * lands, echoing the sticker/handmade mood of the rest of the town. */
function HeartBurst() {
  return (
    <span
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      {[-16, 0, 16].map((dx, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.95, y: 2, x: 0, scale: 0.5 }}
          animate={{ opacity: 0, y: -30 - i * 6, x: dx, scale: 1.2 }}
          transition={{ duration: 0.85, delay: i * 0.07, ease: 'easeOut' }}
          className="absolute"
        >
          <Heart className="h-3.5 w-3.5" style={{ fill: APPLE_RED, color: APPLE_RED }} />
        </motion.span>
      ))}
    </span>
  );
}

function LikeButton({
  photoId,
  api,
  size = 'sm',
}: {
  photoId: number;
  api: LikeApi;
  size?: 'sm' | 'md';
}) {
  const { t } = useLanguage();
  const liked = api.isLiked(photoId);
  const count = api.countOf(photoId);
  const pending = api.isPending(photoId);
  /* keyed so each tap replays the little burst animation */
  const [burst, setBurst] = useState(0);

  /* The tally pops with the new number, but the animation has to run in place:
   * giving this span a `key={count}` made React mount the new node without
   * removing the old one, so the button rendered both totals side by side
   * ("10" right after the first like). */
  const [countRef, animateCount] = useAnimate();
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    void animateCount(
      el,
      { y: [-6, 0], opacity: [0.4, 1] },
      { type: 'spring', stiffness: 380, damping: 18 },
    );
  }, [count, animateCount, countRef]);

  return (
    <motion.button
      type="button"
      /* the polaroid is draggable — keep the tap from starting a drag or
         bubbling up to the photo's tap-to-open handler */
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (liked || pending) return;
        setBurst((n) => n + 1);
        api.like(photoId);
      }}
      disabled={liked || pending}
      whileTap={{ scale: 0.88 }}
      aria-pressed={liked}
      aria-label={t('apple.likeAria')}
      title={liked ? t('apple.likedToday') : t('apple.like')}
      className={cn(
        'relative inline-flex items-center gap-1 rounded-full border-[2.5px] border-white shadow-sticker transition-all duration-300 ease-squash',
        size === 'sm' ? 'px-2.5 py-1' : 'px-3.5 py-2',
        liked
          ? 'bg-[#E8563F] text-white'
          : 'bg-white/85 text-ink hover:-translate-y-0.5 hover:bg-white',
      )}
    >
      <motion.span
        key={liked ? 'on' : 'off'}
        initial={{ scale: liked ? 0.4 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 15 }}
        className="flex"
      >
        <Heart className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', liked && 'fill-current')} />
      </motion.span>
      <motion.span
        ref={countRef}
        className={cn(
          'font-display font-bold tabular-nums',
          size === 'sm' ? 'text-xs' : 'text-sm',
        )}
      >
        {count}
      </motion.span>
      {burst > 0 && <HeartBurst key={burst} />}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Zoom modal                                                          */
/* ------------------------------------------------------------------ */

function ZoomModal({
  photo,
  onClose,
  likeApi,
}: {
  photo: ApplePhotoData;
  onClose: () => void;
  likeApi: LikeApi;
}) {
  const { t } = useLanguage();
  const fmt = usePrettyDate();
  const { setOverlayOpen } = useTown();

  /* Lenis would otherwise swallow the wheel and touch events meant for the
   * caption pane (it listens on the document), and the album behind must not
   * scroll while the sheet is up. */
  usePauseSmoothScroll(true);

  /* The navbar is fixed *above* this overlay (z-5000), so its language and
   * time-of-day pills sat right on top of the close button on a phone. Tuck
   * it away for as long as the sheet is open. */
  useEffect(() => {
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, [setOverlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* The caption pane is the only scrolling band, so signal whether there is
   * more below — a 500-character caption used to just look truncated. */
  const paneRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const measure = useCallback(() => {
    const el = paneRef.current;
    if (!el) return;
    setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    measure();
    /* the handwriting webfont lands after first paint and changes the line
     * count under it, so measure again once it is ready */
    void document.fonts.ready.then(measure);
    const timer = window.setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [measure, photo.id]);

  const caption = photo.description || t('apple.defaultDescription');
  /* Short captions stay centred like a polaroid label; anything long enough
   * to need paragraphs reads far better ranged left. */
  const rangedLeft = caption.length > 160;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={photo.description || t('apple.photoAlt')}
      className="fixed inset-0 z-[6000] flex items-center justify-center overscroll-contain bg-[#4a4470]/60 p-3 backdrop-blur-sm sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.7, rotate: -4, y: 30 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.75, rotate: 3, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        /* Capped to the viewport and split into pinned / scrolling / pinned
         * bands. Previously the card grew as tall as its caption, so on a
         * phone a long description pushed both the like and the close button
         * off-screen with no way to scroll to them. */
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-[0_30px_70px_rgba(74,68,112,0.4)]"
      >
        <button
          onClick={onClose}
          aria-label={t('apple.close')}
          /* Sits inside the card rather than hanging off its corner: the
           * negative offset reached into the navbar's strip on narrow
           * screens. */
          className="absolute right-2.5 top-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#E8563F] text-white shadow-md transition-transform hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="shrink-0 p-4 pb-0">
          <div className="relative overflow-hidden rounded-sm bg-cream">
            {photo.videoUrl ? (
              <>
                <video
                  src={photo.videoUrl}
                  /* The grid already cached the small copy, so the poster costs
                   * nothing extra — using the 1500 px one would. */
                  poster={photo.thumbUrl ?? photo.imageUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="max-h-[38vh] w-full object-cover sm:max-h-[42vh]"
                />
                <span className="absolute left-2 top-2 rounded-full border-2 border-white bg-[#E8563F] px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-white shadow">
                  {t('apple.liveBadge')}
                </span>
              </>
            ) : (
              <img
                src={photo.imageUrl}
                alt={photo.description || t('apple.photoAlt')}
                className="max-h-[38vh] w-full object-cover sm:max-h-[42vh]"
              />
            )}
          </div>
        </div>

        {/* The scrolling band itself must be the flex item. A wrapper plus an
            inner `absolute inset-0` scroller looks equivalent but is not: an
            absolutely positioned child contributes no height, so the card
            shrink-wraps to the image and never reaches its max-height, which
            leaves the caption with almost no room. Keeping the scroll on the
            flexible item gives the card a content height that overflows the
            cap, and only then does the caption band shrink and scroll —
            compact for a short caption, scrollable for a long one. */}
        <div
          ref={paneRef}
          onScroll={measure}
          data-lenis-prevent=""
          className="min-h-0 grow overflow-y-auto overscroll-contain px-4 py-4"
        >
          <p
            className={cn(
              'font-hand whitespace-pre-line text-2xl leading-snug text-ink',
              rangedLeft ? 'text-left' : 'text-center',
            )}
          >
            {caption}
          </p>
          {hasMore && (
            <div
              aria-hidden
              /* sticks to the bottom of the visible band while there is more
                 below, so a long caption never reads as simply cut off */
              className="pointer-events-none sticky bottom-0 -mt-10 h-10 bg-gradient-to-t from-white to-transparent"
            />
          )}
        </div>

        {/* Pinned so both controls stay reachable however long the caption is. */}
        <div className="shrink-0 space-y-2 border-t border-ink/10 px-4 py-3">
          <p
            className="font-display text-center text-sm font-semibold"
            style={{ color: APPLE_RED }}
          >
            {fmt(photo.date)}
          </p>
          <div className="flex justify-center">
            <LikeButton photoId={photo.id} api={likeApi} size="md" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Month navigation — shared by the calendar and the polaroid board     */
/* ------------------------------------------------------------------ */

function MonthNav({
  year,
  month,
  onShift,
  months,
  value,
  onJump,
}: {
  year: number;
  month: number; // 0-11
  onShift: (delta: number) => void;
  /** Months that actually hold apples (`YYYY-MM`, newest first). When given,
   *  a jump list is rendered — with a year of photos, arrows alone would mean
   *  a dozen clicks to reach last December. */
  months?: string[];
  value?: string;
  onJump?: (value: string) => void;
}) {
  const { t } = useLanguage();
  const label = (key: string) => {
    const [y, m] = key.split('-');
    return t('apple.monthTitle', {
      month: t(`apple.months.${Number(m) - 1}`),
      year: y,
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onShift(-1)}
          aria-label={t('apple.prevMonth')}
          className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-cream text-ink shadow-md transition-transform hover:-translate-y-0.5 hover:scale-105"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2
          className="font-display text-2xl font-semibold sm:text-3xl"
          style={{ color: APPLE_RED }}
        >
          {t('apple.monthTitle', { month: t(`apple.months.${month}`), year })}
        </h2>
        <button
          onClick={() => onShift(1)}
          aria-label={t('apple.nextMonth')}
          className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-cream text-ink shadow-md transition-transform hover:-translate-y-0.5 hover:scale-105"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {months && months.length > 1 && onJump && (
        <div className="mt-3 flex justify-center">
          <select
            aria-label={t('apple.jumpToMonth')}
            value={value}
            onChange={(e) => onJump(e.target.value)}
            className="font-hand rounded-full border-[3px] border-white bg-cream px-3 py-1 text-lg text-ink shadow-md outline-none"
          >
            {months.map((key) => (
              <option key={key} value={key}>
                {label(key)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar mode                                                       */
/* ------------------------------------------------------------------ */

function CalendarMode({
  photos,
  onOpen,
  likeApi,
}: {
  photos: ApplePhotoData[];
  onOpen: (p: ApplePhotoData) => void;
  likeApi: LikeApi;
}) {
  const { t } = useLanguage();
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = todayString();

  const byDate = useMemo(() => {
    const map = new Map<string, ApplePhotoData>();
    for (const p of photos) map.set(p.date, p);
    return map;
  }, [photos]);

  const prefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadingBlanks = (new Date(view.year, view.month, 1).getDay() + 6) % 7; // Monday-first
  const monthHasPhotos = photos.some((p) => p.date.startsWith(prefix));

  function shift(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  return (
    <div
      className="sticker-card grain relative overflow-hidden p-4 sm:p-6"
      style={PAPER_JOURNAL_STYLE}
    >
      <MonthNav year={view.year} month={view.month} onShift={shift} />

      {/* weekday row */}
      <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="font-display text-center text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:text-xs"
          >
            {t(`apple.weekdays.${i}`)}
          </div>
        ))}
      </div>

      {/* day cells */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
          const photo = byDate.get(dateStr);
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              className={cn(
                'relative flex min-h-[64px] flex-col items-center rounded-2xl border-2 border-white/70 bg-white/40 p-1 sm:min-h-[96px]',
                isToday && 'ring-2 ring-offset-1 ring-[#E8563F] ring-offset-transparent',
              )}
            >
              <span
                className={cn(
                  'font-display self-start px-1 text-xs font-semibold sm:text-sm',
                  isToday ? 'text-[#E8563F]' : 'text-ink-soft',
                )}
              >
                {day}
              </span>
              {photo ? (
                <motion.button
                  onClick={() => onOpen(photo)}
                  initial={{ rotate: (seededRandom(photo.id, 1) - 0.5) * 10 }}
                  animate={{ rotate: (seededRandom(photo.id, 1) - 0.5) * 10 }}
                  whileHover={{ scale: 1.08, rotate: 0, zIndex: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative mt-0.5 w-[85%] max-w-[76px] rounded-[4px] bg-white p-[3px] pb-2 shadow-[0_6px_14px_rgba(74,68,112,0.22)] transition-shadow hover:shadow-[0_10px_22px_rgba(232,86,63,0.35)]"
                >
                  {/* tape */}
                  <span className="absolute -top-1.5 left-1/2 h-2.5 w-8 -translate-x-1/2 -rotate-3 rounded-[2px] bg-[#ffdd94]/80 shadow-sm" />
                  <img
                    src={photo.thumbUrl ?? photo.imageUrl}
                    alt={photo.description || t('apple.appleAlt')}
                    className="aspect-square w-full rounded-[2px] object-cover"
                    loading="lazy"
                  />
                  {/* read-only tally on the date card — tap to open and like */}
                  {likeApi.countOf(photo.id) > 0 && (
                    <span
                      className="pointer-events-none absolute -bottom-1.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 rounded-full border-2 border-white bg-white/90 px-1.5 py-px text-[9px] font-extrabold tabular-nums shadow-sm"
                      style={{ color: APPLE_RED }}
                    >
                      <Heart className="h-2.5 w-2.5" style={{ fill: APPLE_RED, color: APPLE_RED }} />
                      {likeApi.countOf(photo.id)}
                    </span>
                  )}
                </motion.button>
              ) : (
                <span className="flex flex-1 items-center text-xl opacity-20 grayscale sm:text-2xl">
                  🍏
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!monthHasPhotos && (
        <p className="font-hand mt-4 text-center text-2xl text-ink-soft">
          {t('apple.emptyMonth')}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery mode — draggable polaroid board                             */
/* ------------------------------------------------------------------ */

function GalleryPolaroid({
  photo,
  onOpen,
  boardRef,
  likeApi,
}: {
  photo: ApplePhotoData;
  onOpen: (p: ApplePhotoData) => void;
  boardRef: React.RefObject<HTMLDivElement | null>;
  likeApi: LikeApi;
}) {
  const { t } = useLanguage();
  const fmt = usePrettyDate();
  const rotate = (seededRandom(photo.id, 1) - 0.5) * 12;
  const dx = (seededRandom(photo.id, 2) - 0.5) * 18;
  const dy = (seededRandom(photo.id, 3) - 0.5) * 14;
  const tapeRotate = (seededRandom(photo.id, 4) - 0.5) * 14;

  return (
    <div className="flex justify-center">
      <motion.div
        drag
        dragMomentum
        dragElastic={0.12}
        dragConstraints={boardRef}
        initial={{ rotate }}
        animate={{ rotate }}
        whileHover={{ scale: 1.05, rotate: 0, boxShadow: '0 16px 34px rgba(232,86,63,0.3)' }}
        whileDrag={{
          scale: 1.1,
          rotate: 0,
          zIndex: 30,
          boxShadow: '0 26px 50px rgba(74,68,112,0.35)',
        }}
        onTap={() => onOpen(photo)}
        style={{ x: dx, y: dy }}
        className="relative w-40 cursor-grab touch-none select-none rounded-md bg-white p-2 pb-3 shadow-[0_10px_24px_rgba(74,68,112,0.2)] active:cursor-grabbing sm:w-48"
      >
        {/* tape */}
        <span
          className="absolute -top-2 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-[2px] bg-[#ffdd94]/85 shadow-sm"
          style={{ transform: `translateX(-50%) rotate(${tapeRotate}deg)` }}
        />
        <div className="pointer-events-none">
          <img
            src={photo.thumbUrl ?? photo.imageUrl}
            alt={photo.description || t('apple.appleAlt')}
            className="aspect-square w-full rounded-[3px] object-cover"
            draggable={false}
            loading="lazy"
          />
          {photo.videoUrl && (
            <span className="absolute right-3 top-3 rounded-full border-2 border-white bg-[#E8563F] px-1.5 py-px text-[10px] font-extrabold uppercase text-white shadow">
              {t('apple.liveBadge')}
            </span>
          )}
          <p className="font-hand mt-1.5 line-clamp-2 min-h-[2.2rem] text-center text-lg leading-tight text-ink">
            {photo.description || t('apple.defaultDescription')}
          </p>
          <p className="font-hand text-center text-sm text-ink-soft">{fmt(photo.date)}</p>
        </div>
        {/* like pill — kept outside the pointer-events-none wrapper so it is
            actually tappable, and isolated from the drag / tap-to-open gesture */}
        <div className="mt-1.5 flex justify-center">
          <LikeButton photoId={photo.id} api={likeApi} />
        </div>
      </motion.div>
    </div>
  );
}

function GalleryMode({
  photos,
  onOpen,
  likeApi,
}: {
  photos: ApplePhotoData[];
  onOpen: (p: ApplePhotoData) => void;
  likeApi: LikeApi;
}) {
  const { t } = useLanguage();
  const boardRef = useRef<HTMLDivElement>(null);
  /* `null` means "the newest month with an apple", so a freshly synced photo
   * turns up on its own instead of hiding behind a stale selection. Showing
   * one month at a time also keeps the board at ~30 draggable polaroids —
   * rendering a whole back-filled year at once made phones stutter. */
  const [picked, setPicked] = useState<string | null>(null);

  const months = useMemo(() => {
    const keys = new Set(photos.map((p) => p.date.slice(0, 7)));
    return [...keys].sort().reverse();
  }, [photos]);

  const active = picked ?? months[0] ?? todayString().slice(0, 7);
  const [activeYear, activeMonth] = active.split('-').map(Number);

  const shown = useMemo(
    () => photos.filter((p) => p.date.startsWith(active)),
    [photos, active],
  );

  function shift(delta: number) {
    const m = activeMonth - 1 + delta;
    const y = activeYear + Math.floor(m / 12);
    const mm = ((m % 12) + 12) % 12;
    setPicked(`${y}-${String(mm + 1).padStart(2, '0')}`);
  }

  if (photos.length === 0) {
    return (
      <div className="sticker-card p-12 text-center" style={WOOD_BOARD_STYLE}>
        <div className="text-6xl">🍎</div>
        <p className="font-hand mt-3 text-3xl text-ink-soft">
          {t('apple.emptyGallery')}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      className="sticker-card grain relative overflow-hidden p-6 sm:p-8"
      style={WOOD_BOARD_STYLE}
    >
      <MonthNav
        year={activeYear}
        month={activeMonth - 1}
        onShift={shift}
        months={months}
        value={active}
        onJump={setPicked}
      />

      <p className="font-hand mb-6 text-center text-2xl text-ink-soft">
        {shown.length > 0
          ? t('apple.shuffleHint')
          : t('apple.emptyMonth')}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <GalleryPolaroid key={p.id} photo={p} onOpen={onOpen} boardRef={boardRef} likeApi={likeApi} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** CSS applied only in ?embed=1 mode: strips site chrome so the album fills an iframe. */
const EMBED_CSS = `
html.apple-embed,
html.apple-embed body {
  scroll-behavior: auto !important;
  overscroll-behavior: none;
}
html.apple-embed header.fixed,
html.apple-embed footer,
html.apple-embed canvas[aria-hidden] {
  display: none !important;
}
html.apple-embed main {
  padding-top: 0 !important;
}
`;

export default function AppleAlbum() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'calendar' | 'gallery'>('calendar');
  const [zoomed, setZoomed] = useState<ApplePhotoData | null>(null);

  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get('embed') === '1',
    [],
  );

  useEffect(() => {
    if (!isEmbed) return;
    document.documentElement.classList.add('apple-embed');
    return () => document.documentElement.classList.remove('apple-embed');
  }, [isEmbed]);

  const photosQuery = trpc.town.listApplePhotos.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const photos = (photosQuery.data ?? []) as ApplePhotoData[];

  /* ---- likes --------------------------------------------------------- */
  const deviceId = useMemo(() => getDeviceId(), []);
  const likesQuery = trpc.town.listAppleLikes.useQuery(
    { deviceId },
    { retry: 1, refetchOnWindowFocus: false },
  );
  const likeMutation = trpc.town.likeApple.useMutation();

  const serverCounts = likesQuery.data?.counts;
  const serverLiked = useMemo(
    () => new Set(likesQuery.data?.liked ?? []),
    [likesQuery.data],
  );

  /* Optimistic overlay: the heart fills the instant you tap, then the
   * refetched server tally becomes the source of truth. The overlay sticks
   * around so the heart does not flicker back while that fetch is in flight. */
  const [bump, setBump] = useState<Record<number, number>>({});
  const [likedNow, setLikedNow] = useState<number[]>([]);
  const [liking, setLiking] = useState<number[]>([]);

  const like = (photoId: number) => {
    if (
      serverLiked.has(photoId) ||
      likedNow.includes(photoId) ||
      liking.includes(photoId)
    ) {
      return;
    }
    setBump((b) => ({ ...b, [photoId]: (b[photoId] ?? 0) + 1 }));
    setLikedNow((l) => [...l, photoId]);
    setLiking((p) => [...p, photoId]);
    likeMutation.mutate(
      { photoId, deviceId },
      {
        onSuccess: () => {
          setBump((b) => {
            const next = { ...b };
            delete next[photoId];
            return next;
          });
          void likesQuery.refetch();
        },
        onError: () => {
          setBump((b) => {
            const next = { ...b };
            delete next[photoId];
            return next;
          });
          setLikedNow((l) => l.filter((v) => v !== photoId));
          toast(t('apple.likeError'));
        },
        onSettled: () => setLiking((p) => p.filter((v) => v !== photoId)),
      },
    );
  };

  const likeApi: LikeApi = {
    isLiked: (id) => serverLiked.has(id) || likedNow.includes(id),
    countOf: (id) => (serverCounts?.[String(id)] ?? 0) + (bump[id] ?? 0),
    isPending: (id) => liking.includes(id),
    like,
  };

  return (
    <div
      className={cn(
        'mx-auto',
        isEmbed ? 'max-w-none px-2 py-2 sm:px-3' : 'max-w-6xl px-4 py-10 sm:px-6',
      )}
    >
      {isEmbed && <style>{EMBED_CSS}</style>}

      {!isEmbed && (
        <div className="mb-6 flex justify-start">
          <Link
            to="/"
            className="font-display inline-flex items-center gap-1 rounded-full border-[3px] border-white bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-md backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
          >
            {t('apple.backToTown')}
          </Link>
        </div>
      )}

      <header className={cn('text-center', isEmbed ? 'mb-4' : 'mb-8')}>
        <h1
          className="font-display text-4xl font-semibold sm:text-5xl"
          style={{ color: APPLE_RED }}
        >
          {t('apple.title')}
        </h1>
        <p className="font-hand mt-2 text-xl font-normal text-ink-soft sm:text-2xl">
          {t('apple.subtitle')}
        </p>

        {/* mode toggle */}
        <div className="mt-6 inline-flex gap-2 rounded-full border-[3px] border-white bg-white/50 p-1.5 shadow-md">
          {(
            [
              { id: 'calendar', labelKey: 'apple.calendar', icon: CalendarDays },
              { id: 'gallery', labelKey: 'apple.gallery', icon: Images },
            ] as const
          ).map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                'font-display flex items-center gap-1.5 rounded-full border-[3px] px-5 py-2 text-sm font-semibold transition-all',
                mode === id
                  ? 'border-white bg-[#E8563F] text-white shadow-[0_5px_0_rgba(74,68,112,0.18)]'
                  : 'border-transparent text-ink-soft hover:scale-105 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </header>

      {photosQuery.isLoading ? (
        <div className="sticker-card p-16 text-center">
          <p className="font-hand text-3xl text-ink-soft">{t('apple.loading')}</p>
        </div>
      ) : photosQuery.error ? (
        <div className="sticker-card mx-auto max-w-lg p-12 text-center">
          <div className="text-6xl">🧺</div>
          <p className="font-display mt-3 text-2xl font-semibold" style={{ color: APPLE_RED }}>
            {t('apple.basketTitle')}
          </p>
          <p className="font-hand mt-1 text-2xl text-ink-soft">{t('apple.basketBody')}</p>
        </div>
      ) : mode === 'calendar' ? (
        <CalendarMode photos={photos} onOpen={setZoomed} likeApi={likeApi} />
      ) : (
        <GalleryMode photos={photos} onOpen={setZoomed} likeApi={likeApi} />
      )}

      <AnimatePresence>
        {zoomed && (
          <ZoomModal photo={zoomed} onClose={() => setZoomed(null)} likeApi={likeApi} />
        )}
      </AnimatePresence>
    </div>
  );
}
