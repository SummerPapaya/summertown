import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { SQUASH, Words } from './anim';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

const ITEMS: { id: string; keyPrefix: string }[] = [
  { id: 'cushion', keyPrefix: 'visit.packing.items.0' },
  { id: 'seashell', keyPrefix: 'visit.packing.items.1' },
  { id: 'kite', keyPrefix: 'visit.packing.items.2' },
  { id: 'song', keyPrefix: 'visit.packing.items.3' },
  { id: 'pie', keyPrefix: 'visit.packing.items.4' },
  { id: 'blanket', keyPrefix: 'visit.packing.items.5' },
  { id: 'key', keyPrefix: 'visit.packing.items.6' },
];

const SCRAP_COLORS = [
  'var(--coral)',
  'var(--butter)',
  'var(--mint)',
  'var(--seafoam)',
  'var(--lavender)',
  'var(--rose)',
  'var(--apricot)',
];

/** deterministic PRNG so render stays pure (est. 1862, naturally) */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** mini confetti of paper scraps — fired once per 100% completion */
function ConfettiBurst() {
  const pieces = useMemo(() => {
    const rand = mulberry32(1962);
    return Array.from({ length: 26 }, (_, i) => ({
      left: rand() * 100,
      delay: rand() * 0.3,
      dur: 1.9 + rand() * 0.9,
      rot: 180 + rand() * 360,
      drift: (rand() - 0.5) * 140,
      color: SCRAP_COLORS[i % SCRAP_COLORS.length],
      w: 8 + rand() * 6,
      h: 10 + rand() * 8,
    }));
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[28px]" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 rounded-[3px]"
          style={{ left: `${p.left}%`, width: p.w, height: p.h, background: p.color }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: 520, x: p.drift, rotate: p.rot, opacity: [1, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.3, 0.6, 0.6, 1] }}
        />
      ))}
    </div>
  );
}

export default function PackingList() {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
  const [checked, setChecked] = useState<boolean[]>(() =>
    ITEMS.map((it) => it.id === 'key'),
  );
  const [sparkle, setSparkle] = useState<{ id: string; key: number } | null>(null);
  const sparkleSeq = useRef(0);
  const [burst, setBurst] = useState(0);

  const count = checked.filter(Boolean).length;
  const done = count === ITEMS.length;

  // clear the burst after the scraps have fallen
  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(0), 3400);
    return () => window.clearTimeout(t);
  }, [burst]);

  const toggle = (index: number) => {
    const next = [...checked];
    next[index] = !next[index];
    setChecked(next);
    if (next[index]) {
      sparkleSeq.current += 1;
      setSparkle({ id: ITEMS[index].id, key: sparkleSeq.current });
    }
    // 100% — mini confetti + toast
    if (next.every(Boolean)) {
      toast(t('visit.packing.packedToast'));
      if (!reduced) setBurst((b) => b + 1);
    }
  };

  return (
    <section className="mx-auto max-w-[760px] px-6 py-24">
      <div className="text-center">
        <p className="kicker text-coral">
          {t('visit.packing.kicker')}
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
          <Words text={t('visit.packing.title')} />
        </h2>

        {/* progress bar — fills with a squashy tween */}
        <div className="mx-auto mt-6 max-w-[640px]">
          <div
            className="h-4 overflow-hidden rounded-full border-[3px] border-white bg-white/60 shadow-inner"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ITEMS.length}
            aria-valuenow={count}
            aria-label={t('visit.packing.progressAria')}
          >
            <motion.div
              className={cn(
                'h-full origin-left rounded-full',
                done ? 'bg-gradient-to-r from-butter to-coral' : 'bg-gradient-to-r from-seafoam to-lagoon',
              )}
              initial={false}
              animate={{ scaleX: count / ITEMS.length }}
              transition={{ duration: 0.5, ease: SQUASH }}
              style={{ width: '100%' }}
            />
          </div>
          <p className="mt-2 font-hand text-2xl text-ink-soft" aria-hidden>
            {t('visit.packing.packed', { c: count, n: ITEMS.length })}
          </p>
        </div>
      </div>

      {/* checklist sticker card */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: SQUASH }}
        className="sticker-card relative mx-auto mt-8 max-w-[640px] p-4 md:p-6"
      >
        <AnimatePresence>{burst > 0 && <ConfettiBurst key={burst} />}</AnimatePresence>

        <ul className="flex flex-col gap-1.5">
          {ITEMS.map((it, i) => {
            const isChecked = checked[i];
            return (
              <motion.li
                key={it.id}
                initial={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
                whileInView={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: SQUASH }}
              >
                <motion.label
                  animate={{ scale: isChecked ? 0.98 : 1 }}
                  transition={{ duration: 0.25, ease: SQUASH }}
                  className="group relative flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-3 transition-colors duration-200 hover:bg-white/50"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(i)}
                    className="peer sr-only"
                  />
                  {/* big rounded squashy checkbox */}
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border-[3px] shadow-sm transition-all [transition-duration:250ms] ease-squash group-hover:scale-[1.15] peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper',
                      isChecked ? 'border-white bg-mint' : 'border-white bg-cream',
                    )}
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5">
                      <motion.path
                        d="M5 13 L10 18 L19 7"
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={false}
                        animate={{ pathLength: isChecked ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </svg>
                  </span>

                  <span
                    className={cn(
                      'font-extrabold transition-colors duration-300',
                      isChecked ? 'text-ink-soft line-through' : 'text-ink',
                    )}
                  >
                    {t(`${it.keyPrefix}.label`)}
                  </span>
                  {t(`${it.keyPrefix}.aside`) && (
                    <span
                      className={cn(
                        'ml-auto font-hand text-xl leading-none transition-colors duration-300',
                        isChecked ? 'text-ink-soft/70 line-through' : 'text-ink-soft',
                      )}
                    >
                      ({t(`${it.keyPrefix}.aside`)})
                    </span>
                  )}

                  {/* tiny sparkle on check */}
                  {sparkle?.id === it.id && !reduced && (
                    <svg
                      key={sparkle.key}
                      viewBox="0 0 24 24"
                      className="vt-sparkle-pop pointer-events-none absolute -left-1 -top-2 h-6 w-6"
                      aria-hidden
                    >
                      <path
                        d="M12 2 C12.8 8 14 10 20 12 C14 14 12.8 16 12 22 C11.2 16 10 14 4 12 C10 10 11.2 8 12 2 Z"
                        fill="var(--butter)"
                        stroke="var(--coral)"
                        strokeWidth="1.2"
                      />
                    </svg>
                  )}
                </motion.label>
              </motion.li>
            );
          })}
        </ul>

        {/* key footnote */}
        <p className="mt-4 flex items-start gap-2 border-t-2 border-dashed border-ink/10 px-3 pt-4 font-hand text-xl leading-snug text-ink-soft">
          <KeyRound className="mt-1 h-4 w-4 shrink-0" />
          <span>
            {t('visit.packing.keyFoot')}
          </span>
        </p>
      </motion.div>
    </section>
  );
}
