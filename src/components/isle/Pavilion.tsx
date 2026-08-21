import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useTown } from '@/lib/town';
import { trpc } from '@/providers/trpc';
import { useLanguage } from '@/lib/i18n';
import { playBellNote } from './sounds';
import { NoteGlyph } from './shared';
import { BACK_OUT, SQUASH } from './hooks';

/* hotspot positions = the five big brass bells in isle-pavilion-scene.png
   (markers sit just under each bell mouth, % of the image box) */
const BELLS = [
  { x: 27.5, y: 21, note: 'Do', accent: '#FFDD94' },
  { x: 36, y: 26.5, note: 'Re', accent: '#FFC9A3' },
  { x: 45, y: 29, note: 'Mi', accent: '#FF9B9B' },
  { x: 53, y: 28, note: 'Sol', accent: '#FFC3D0' },
  { x: 62, y: 29.5, note: 'La', accent: '#C6B6E8' },
];
const WISH_ACCENTS = ['#FFDD94', '#FFC3D0', '#BDEBD2', '#E6DDF7', '#FFC9A3', '#A5E3D8'];
const WISHES_KEY = 'st-isle-wishes';
const SEED_WISH_COUNT = 6;

interface Wish {
  id: string;
  text: string;
  accent: string;
  fresh?: boolean;
}

function loadWishes(): Wish[] {
  try {
    const raw = localStorage.getItem(WISHES_KEY);
    if (raw) {
      const arr: unknown = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr
          .filter(
            (w): w is { text: string; accent?: string } =>
              !!w && typeof (w as { text?: unknown }).text === 'string',
          )
          .map((w, i) => ({
            id: `u${i}`,
            text: w.text.slice(0, 60),
            accent:
              typeof w.accent === 'string' ? w.accent : WISH_ACCENTS[i % WISH_ACCENTS.length],
          }));
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

const panel = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { y: 40, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: SQUASH } },
};

/** one paper strip hanging on the wish line (perpetual ±6° sway) */
function WishStrip({ wish, index }: { wish: Wish; index: number }) {
  const tilt = ((index * 37) % 7) - 3;
  const dur = 2.6 + ((index * 53) % 10) / 10;
  const strip = (
    <div
      className="ambient flex flex-col items-center"
      style={{
        animation: `isle-wish-sway ${dur}s ease-in-out ${index * 0.3}s infinite`,
        transformOrigin: 'top center',
      }}
    >
      <span className="h-2.5 w-[2px] bg-[#C89B7B]" aria-hidden />
      <span
        className="block w-[112px] rounded-md border-2 border-white px-2 py-1.5 shadow-sm"
        style={{ background: wish.accent, transform: `rotate(${tilt}deg)` }}
      >
        <span className="block line-clamp-4 break-words font-hand text-[1.05rem] leading-[1.15] text-ink">
          {wish.text}
        </span>
      </span>
    </div>
  );
  if (wish.fresh) {
    return (
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        style={{ transformOrigin: 'top' }}
        transition={{ duration: 0.5, ease: BACK_OUT }}
      >
        {strip}
      </motion.div>
    );
  }
  return <div>{strip}</div>;
}

/**
 * Section 3 — The Windbell Pavilion. Five playable bells (illustration
 * hotspots + chime ladder), cycling fortune captions, and a tie-a-wish
 * line persisted to the town database (localStorage fallback when the
 * backend is unreachable, e.g. the static build).
 */
export default function Pavilion() {
  const { soundOn } = useTown();
  const { t } = useLanguage();
  const [rings, setRings] = useState(0);
  const [wobble, setWobble] = useState({ i: -1, tick: 0 });
  const [bursts, setBursts] = useState<{ id: number; i: number }[]>([]);
  const burstId = useRef(0);
  const timers = useRef<number[]>([]);
  const [userWishes, setUserWishes] = useState<Wish[]>(loadWishes);
  const [draft, setDraft] = useState('');

  /* wishes live in the town database; when it can't be reached (static
     build / network down) we silently keep them in localStorage instead */
  const utils = trpc.useUtils();
  const wishesQuery = trpc.town.listWishes.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const addWishMutation = trpc.town.addWish.useMutation();
  const [offline, setOffline] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  /* older pages fetched via the "load more" button (offset pagination) */
  const [olderWishes, setOlderWishes] = useState<{ rows: Wish[]; nextCursor: number | null }>({
    rows: [],
    nextCursor: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const useLocal = offline || wishesQuery.isError;
  const serverWishes: Wish[] = [
    ...(wishesQuery.data?.items ?? []).map((w) => ({
      id: `d${w.id}`,
      text: w.text,
      accent: w.accent,
      fresh: freshIds.has(w.id),
    })),
    ...olderWishes.rows,
  ];
  /* once older pages are loaded their cursor wins; otherwise the first
     page's cursor decides whether more wishes exist on the server */
  const wishesCursor = olderWishes.rows.length
    ? olderWishes.nextCursor
    : (wishesQuery.data?.nextCursor ?? null);

  const loadMoreWishes = async () => {
    if (loadingMore || wishesCursor == null) return;
    setLoadingMore(true);
    try {
      const page = await utils.town.listWishes.fetch({ cursor: wishesCursor });
      setOlderWishes((prev) => {
        const seen = new Set([
          ...(wishesQuery.data?.items ?? []).map((w) => w.id),
          ...prev.rows.map((w) => Number(w.id.slice(1))),
        ]);
        return {
          rows: [
            ...prev.rows,
            ...page.items
              .filter((w) => !seen.has(w.id))
              .map((w) => ({ id: `d${w.id}`, text: w.text, accent: w.accent })),
          ],
          nextCursor: page.nextCursor,
        };
      });
    } catch {
      /* keep the button visible so the visitor can retry */
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const stash = timers.current;
    return () => stash.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        WISHES_KEY,
        JSON.stringify(userWishes.map(({ text, accent }) => ({ text, accent }))),
      );
    } catch {
      /* ignore */
    }
  }, [userWishes]);

  const ring = (i: number) => {
    const id = ++burstId.current;
    setBursts((b) => [...b, { id, i }]);
    timers.current.push(
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1500),
    );
    setWobble((w) => ({ i, tick: w.tick + 1 }));
    setRings((r) => r + 1);
    if (soundOn) playBellNote(i);
  };

  const addWish = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim().slice(0, 60);
    if (!text) return;
    const accent = WISH_ACCENTS[Math.floor(Math.random() * WISH_ACCENTS.length)];
    setDraft('');
    toast(t('isle.pavilion.wishToast'));
    if (useLocal) {
      setUserWishes((w) => [...w, { id: `u${Date.now()}`, text, accent, fresh: true }]);
      return;
    }
    // tie it on the rope right away, then settle up with the database
    const tempId = -Date.now();
    setFreshIds((s) => new Set(s).add(tempId));
    // a new row at the head shifts every offset — previously loaded older
    // pages would skip a wish, so collapse back to the first page
    setOlderWishes({ rows: [], nextCursor: null });
    utils.town.listWishes.setData(undefined, (old) => ({
      items: [{ id: tempId, text, accent, createdAt: new Date() }, ...(old?.items ?? [])],
      total: (old?.total ?? 0) + 1,
      nextCursor: old?.nextCursor ?? null,
    }));
    addWishMutation.mutate(
      { text, accent },
      {
        onSuccess: () => {
          void utils.town.listWishes.invalidate();
        },
        onError: () => {
          // backend unreachable — keep the wish on this device instead
          setOffline(true);
          utils.town.listWishes.setData(undefined, (old) =>
            old
              ? {
                  ...old,
                  items: old.items.filter((w) => w.id !== tempId),
                  total: Math.max(0, old.total - 1),
                }
              : old,
          );
          setUserWishes((w) => [...w, { id: `u${Date.now()}`, text, accent, fresh: true }]);
        },
      },
    );
  };

  const allWishes: Wish[] = [
    ...Array.from({ length: SEED_WISH_COUNT }, (_, i) => ({
      id: `s${i}`,
      text: t(`isle.pavilion.seedWishes.${i}`),
      accent: WISH_ACCENTS[i % WISH_ACCENTS.length],
    })),
    ...serverWishes,
    ...userWishes,
  ];

  const caption =
    rings === 0
      ? t('isle.pavilion.ringPrompt')
      : t('isle.pavilion.meaning', { m: t(`isle.pavilion.meanings.${(rings - 1) % 5}`) });

  return (
    <section
      aria-label={t('isle.pavilion.sectionAria')}
      className="relative mx-auto max-w-[1200px] px-6 py-24 md:py-32"
    >
      <motion.div
        variants={panel}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="rounded-panel border-[3px] border-white p-5 shadow-sticker md:p-10"
        style={{ background: 'linear-gradient(160deg, var(--lilac), var(--paper) 70%)' }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* left: scene + wish line */}
          <motion.div variants={item}>
            <motion.div
              initial={{ rotate: -1.5 }}
              whileInView={{ rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: SQUASH }}
              className="sticker-card relative overflow-hidden p-2"
            >
              <div className="relative overflow-hidden rounded-[20px]">
                <img
                  src="/isle-pavilion-scene.png"
                  alt={t('isle.pavilion.sceneAlt')}
                  loading="lazy"
                  className="block h-auto w-full"
                />
                {/* playable bell hotspots (pulsing dots) */}
                {BELLS.map((b, i) => (
                  <button
                    key={b.note}
                    type="button"
                    aria-label={t('isle.pavilion.ringAria', { ord: t(`isle.pavilion.ordinals.${i}`) })}
                    onClick={() => ring(i)}
                    className="group absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-pop transition-transform duration-200 ease-squash hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:h-9 md:w-9"
                    style={{ left: `${b.x}%`, top: `${b.y}%`, background: b.accent }}
                  >
                    <span
                      className="ambient absolute inset-0 rounded-full border-2 border-white/70"
                      aria-hidden
                      style={{ animation: `isle-breathe 1.6s ease-in-out ${i * 0.18}s infinite` }}
                    />
                    <motion.span
                      key={wobble.i === i ? `w${wobble.tick}` : 'idle'}
                      initial={wobble.i === i ? { rotate: 0 } : false}
                      animate={
                        wobble.i === i ? { rotate: [0, -14, 12, -9, 6, -3, 0] } : { rotate: 0 }
                      }
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="relative inline-block origin-top"
                    >
                      <Bell className="h-4 w-4 text-ink" aria-hidden />
                    </motion.span>
                  </button>
                ))}
                {/* ring bursts: ripple rings + note bubble */}
                {bursts.map(({ id, i }) => (
                  <span
                    key={id}
                    className="pointer-events-none absolute"
                    style={{ left: `${BELLS[i].x}%`, top: `${BELLS[i].y - 7}%` }}
                    aria-hidden
                  >
                    {[0, 1, 2].map((r) => (
                      <span
                        key={r}
                        className="absolute left-0 top-0 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90"
                        style={{ animation: `st-wave-pulse 1s ease-out ${r * 0.12}s both` }}
                      />
                    ))}
                    <span
                      className="absolute -left-3.5 -top-4 block h-7 w-7"
                      style={{ animation: 'isle-note-float 1.1s ease-out both' }}
                    >
                      <NoteGlyph className="h-full w-full" color={BELLS[i].accent} />
                    </span>
                  </span>
                ))}
              </div>
            </motion.div>

            {/* wish line strung under the illustration */}
            <div className="relative mt-2 px-1 pt-7">
              <svg
                className="absolute inset-x-0 top-0 h-7 w-full"
                viewBox="0 0 600 28"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M0 5 Q300 30 600 5"
                  fill="none"
                  stroke="#C89B7B"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-2">
                {allWishes.map((w, idx) => (
                  <WishStrip key={w.id} wish={w} index={idx} />
                ))}
              </div>
              {/* offline/local lists are already complete — no pager needed */}
              {!useLocal && wishesCursor != null && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadMoreWishes()}
                    disabled={loadingMore}
                    className="btn-secondary px-5 py-2 text-sm disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingMore ? t('common.loading') : t('common.loadMore')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* right: copy + chime ladder + tie-a-wish */}
          <div className="flex flex-col justify-center">
            <motion.p
              variants={item}
              className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral"
            >
              {t('isle.pavilion.kicker')}
            </motion.p>
            <motion.h2
              variants={item}
              className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink"
            >
              {t('isle.pavilion.title')}
            </motion.h2>
            <motion.p
              variants={item}
              className="mt-4 max-w-[52ch] text-[clamp(1rem,1.15vw,1.15rem)] font-semibold leading-[1.65] text-ink/90"
            >
              {t('isle.pavilion.body')}
            </motion.p>

            {/* chime ladder */}
            <motion.div
              variants={item}
              className="mt-6 flex flex-wrap gap-2.5"
              role="group"
              aria-label={t('isle.pavilion.ladderAria')}
            >
              {BELLS.map((b, i) => (
                <button
                  key={b.note}
                  type="button"
                  onClick={() => ring(i)}
                  aria-label={t('isle.pavilion.ringAriaNote', { ord: t(`isle.pavilion.ordinals.${i}`), note: b.note })}
                  className="flex items-center gap-2 rounded-full border-[3px] border-white px-4 py-2 font-extrabold text-ink shadow-pop transition-transform duration-200 ease-squash hover:-translate-y-0.5 hover:scale-105 active:translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${b.accent}, #FFF9EF)` }}
                >
                  <motion.span
                    key={wobble.i === i ? `w${wobble.tick}` : 'idle'}
                    initial={wobble.i === i ? { rotate: 0 } : false}
                    animate={
                      wobble.i === i ? { rotate: [0, -14, 12, -9, 6, -3, 0] } : { rotate: 0 }
                    }
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="inline-block origin-top"
                  >
                    <Bell className="h-4 w-4" aria-hidden />
                  </motion.span>
                  {b.note}
                </button>
              ))}
            </motion.div>

            {/* fortune caption */}
            <motion.div variants={item} className="mt-4 flex h-9 items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={rings}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-hand text-2xl leading-none text-ink"
                >
                  {caption}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* tie a wish */}
            <motion.form variants={item} onSubmit={addWish} className="mt-5">
              <label
                htmlFor="isle-wish"
                className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft"
              >
                {t('isle.pavilion.wishLabel')}
              </label>
              <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                <input
                  id="isle-wish"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={60}
                  placeholder={t('isle.pavilion.wishPlaceholder')}
                  className="w-full flex-1 rounded-full border-2 border-ink/15 bg-cream px-5 py-3 font-semibold text-ink placeholder:text-ink-soft/70 focus:border-coral focus:outline-none"
                />
                <button type="submit" className="btn-primary whitespace-nowrap">
                  {t('isle.pavilion.wishButton')}
                </button>
              </div>
              <p className="mt-1.5 text-xs font-bold text-ink-soft">
                {t('isle.pavilion.charsLeft', { n: 60 - draft.length })}
              </p>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
