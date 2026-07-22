import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useTown } from '@/lib/town';
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
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
const MEANINGS = [
  'good news',
  'rain later',
  "someone's thinking of you",
  'pie is ready',
  'the tide said hi',
];
const WISH_ACCENTS = ['#FFDD94', '#FFC3D0', '#BDEBD2', '#E6DDF7', '#FFC9A3', '#A5E3D8'];
const WISHES_KEY = 'st-isle-wishes';

const SEED_WISHES = [
  'for the tide to bring back my blue bucket',
  'that the bakery never runs out of melon pan',
  'for one more week of summer',
  'that the gulls learn my name',
  'for rain on the tin roof tonight',
  "that granny's roses win again",
];

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
 * line persisted to localStorage.
 */
export default function Pavilion() {
  const { soundOn } = useTown();
  const [rings, setRings] = useState(0);
  const [wobble, setWobble] = useState({ i: -1, tick: 0 });
  const [bursts, setBursts] = useState<{ id: number; i: number }[]>([]);
  const burstId = useRef(0);
  const timers = useRef<number[]>([]);
  const [userWishes, setUserWishes] = useState<Wish[]>(loadWishes);
  const [draft, setDraft] = useState('');

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
    setUserWishes((w) => [
      ...w,
      {
        id: `u${Date.now()}`,
        text,
        accent: WISH_ACCENTS[Math.floor(Math.random() * WISH_ACCENTS.length)],
        fresh: true,
      },
    ]);
    setDraft('');
    toast('Wish tied — the wind will read it.');
  };

  const allWishes: Wish[] = [
    ...SEED_WISHES.map((text, i) => ({
      id: `s${i}`,
      text,
      accent: WISH_ACCENTS[i % WISH_ACCENTS.length],
    })),
    ...userWishes,
  ];

  const caption =
    rings === 0
      ? 'give one a ring — the wind is listening'
      : `that one means “${MEANINGS[(rings - 1) % MEANINGS.length]}”`;

  return (
    <section
      aria-label="The windbell pavilion"
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
                  alt="Rows of brass windbells hanging in the pavilion above the lily meadow"
                  loading="lazy"
                  className="block h-auto w-full"
                />
                {/* playable bell hotspots (pulsing dots) */}
                {BELLS.map((b, i) => (
                  <button
                    key={b.note}
                    type="button"
                    aria-label={`Ring the ${ORDINALS[i]} windbell`}
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
            </div>
          </motion.div>

          {/* right: copy + chime ladder + tie-a-wish */}
          <div className="flex flex-col justify-center">
            <motion.p
              variants={item}
              className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral"
            >
              the windbell pavilion
            </motion.p>
            <motion.h2
              variants={item}
              className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink"
            >
              The pavilion plays the weather.
            </motion.h2>
            <motion.p
              variants={item}
              className="mt-4 max-w-[52ch] text-[clamp(1rem,1.15vw,1.15rem)] font-semibold leading-[1.65] text-ink/90"
            >
              Rows of brass bells hang where the breeze can read them. Locals say the
              pavilion forecast the great calm of &rsquo;98 an hour before the sea agreed.
            </motion.p>

            {/* chime ladder */}
            <motion.div
              variants={item}
              className="mt-6 flex flex-wrap gap-2.5"
              role="group"
              aria-label="Chime ladder — play the five windbells"
            >
              {BELLS.map((b, i) => (
                <button
                  key={b.note}
                  type="button"
                  onClick={() => ring(i)}
                  aria-label={`Ring the ${ORDINALS[i]} windbell (${b.note})`}
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
                Tie a wish to the bells
              </label>
              <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                <input
                  id="isle-wish"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={60}
                  placeholder="whisper it to the wind…"
                  className="w-full flex-1 rounded-full border-2 border-ink/15 bg-cream px-5 py-3 font-semibold text-ink placeholder:text-ink-soft/70 focus:border-coral focus:outline-none"
                />
                <button type="submit" className="btn-primary whitespace-nowrap">
                  Tie a wish to the bells
                </button>
              </div>
              <p className="mt-1.5 text-xs font-bold text-ink-soft">
                {60 - draft.length} characters left · wishes keep on this device
              </p>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
