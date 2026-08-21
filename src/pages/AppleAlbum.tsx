import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import { prettyDate, seededRandom } from '@/lib/apple';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Shape of one row returned by town.listApplePhotos. */
interface ApplePhotoData {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  image: string; // base64 data URL
  video: string | null; // base64 data URL
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
/* Zoom modal                                                          */
/* ------------------------------------------------------------------ */

function ZoomModal({ photo, onClose }: { photo: ApplePhotoData; onClose: () => void }) {
  const { t } = useLanguage();
  const fmt = usePrettyDate();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#4a4470]/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.7, rotate: -4, y: 30 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.75, rotate: 3, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-lg bg-white p-4 pb-6 shadow-[0_30px_70px_rgba(74,68,112,0.4)]"
      >
        <button
          onClick={onClose}
          aria-label={t('apple.close')}
          className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#E8563F] text-white shadow-md transition-transform hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative overflow-hidden rounded-sm bg-cream">
          {photo.video ? (
            <>
              <video
                src={photo.video}
                poster={photo.image}
                autoPlay
                muted
                loop
                playsInline
                className="max-h-[60vh] w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full border-2 border-white bg-[#E8563F] px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-white shadow">
                {t('apple.liveBadge')}
              </span>
            </>
          ) : (
            <img
              src={photo.image}
              alt={photo.description || t('apple.photoAlt')}
              className="max-h-[60vh] w-full object-cover"
            />
          )}
        </div>
        <p className="font-hand mt-4 text-center text-2xl leading-snug text-ink">
          {photo.description || t('apple.defaultDescription')}
        </p>
        <p className="font-display mt-1 text-center text-sm font-semibold" style={{ color: APPLE_RED }}>
          {fmt(photo.date)}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar mode                                                       */
/* ------------------------------------------------------------------ */

function CalendarMode({
  photos,
  onOpen,
}: {
  photos: ApplePhotoData[];
  onOpen: (p: ApplePhotoData) => void;
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
      {/* month header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          aria-label={t('apple.prevMonth')}
          className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-cream text-ink shadow-md transition-transform hover:-translate-y-0.5 hover:scale-105"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2
          className="font-display text-2xl font-semibold sm:text-3xl"
          style={{ color: APPLE_RED }}
        >
          {t('apple.monthTitle', { month: t(`apple.months.${view.month}`), year: view.year })}
        </h2>
        <button
          onClick={() => shift(1)}
          aria-label={t('apple.nextMonth')}
          className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-cream text-ink shadow-md transition-transform hover:-translate-y-0.5 hover:scale-105"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

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
                    src={photo.image}
                    alt={photo.description || t('apple.appleAlt')}
                    className="aspect-square w-full rounded-[2px] object-cover"
                    loading="lazy"
                  />
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
}: {
  photo: ApplePhotoData;
  onOpen: (p: ApplePhotoData) => void;
  boardRef: React.RefObject<HTMLDivElement | null>;
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
            src={photo.image}
            alt={photo.description || t('apple.appleAlt')}
            className="aspect-square w-full rounded-[3px] object-cover"
            draggable={false}
            loading="lazy"
          />
          {photo.video && (
            <span className="absolute right-3 top-3 rounded-full border-2 border-white bg-[#E8563F] px-1.5 py-px text-[10px] font-extrabold uppercase text-white shadow">
              {t('apple.liveBadge')}
            </span>
          )}
          <p className="font-hand mt-1.5 line-clamp-2 min-h-[2.2rem] text-center text-lg leading-tight text-ink">
            {photo.description || t('apple.defaultDescription')}
          </p>
          <p className="font-hand text-center text-sm text-ink-soft">{fmt(photo.date)}</p>
        </div>
      </motion.div>
    </div>
  );
}

function GalleryMode({
  photos,
  onOpen,
}: {
  photos: ApplePhotoData[];
  onOpen: (p: ApplePhotoData) => void;
}) {
  const { t } = useLanguage();
  const boardRef = useRef<HTMLDivElement>(null);

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
      <p className="font-hand mb-6 text-center text-2xl text-ink-soft">
        {t('apple.shuffleHint')}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <GalleryPolaroid key={p.id} photo={p} onOpen={onOpen} boardRef={boardRef} />
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
        <CalendarMode photos={photos} onOpen={setZoomed} />
      ) : (
        <GalleryMode photos={photos} onOpen={setZoomed} />
      )}

      <AnimatePresence>
        {zoomed && <ZoomModal photo={zoomed} onClose={() => setZoomed(null)} />}
      </AnimatePresence>
    </div>
  );
}
