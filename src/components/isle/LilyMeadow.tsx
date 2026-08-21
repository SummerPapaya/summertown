import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTown } from '@/lib/town';
import { useLanguage } from '@/lib/i18n';
import { playLilyNote } from './sounds';
import { NoteGlyph, WordRise } from './shared';
import { usePrefersReducedMotion, SQUASH, BACK_OUT } from './hooks';

const CHIP_KEYS = ['isle.meadow.chips.0', 'isle.meadow.chips.1', 'isle.meadow.chips.2'];

/** little lily-of-the-valley stem: curved stalk + three hanging bells + leaf */
function LilySvg() {
  return (
    <svg viewBox="0 0 40 84" className="h-full w-full" aria-hidden fill="none">
      <path
        d="M20 82 C19 60 23 40 20 14"
        stroke="#8FD3A8"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M20 64 C10 62 5 54 4 46 C14 48 19 56 20 64 Z" fill="#8FD3A8" />
      {/* connectors */}
      <path d="M20 20 Q15 22 13.5 25" stroke="#8FD3A8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 33 Q25 34 26.5 37" stroke="#8FD3A8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 46 Q15 48 13.5 51" stroke="#8FD3A8" strokeWidth="1.6" strokeLinecap="round" />
      {/* bells */}
      {[
        { x: 13.5, y: 25 },
        { x: 26.5, y: 37 },
        { x: 13.5, y: 51 },
      ].map((b, i) => (
        <path
          key={i}
          transform={`translate(${b.x} ${b.y})`}
          d="M0 0 C-4.5 0 -6.5 3.5 -6.5 6.5 C-7.4 7.8 -7.9 8.8 -8 9.6 L8 9.6 C7.9 8.8 7.4 7.8 6.5 6.5 C6.5 3.5 4.5 0 0 0 Z"
          fill="#FFFDF6"
          stroke="rgba(74,68,112,0.14)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/** one swaying stem; hover/focus rings a tiny chime-note ripple at its bell */
function LilyStem({ i, soundOn }: { i: number; soundOn: boolean }) {
  const { t } = useLanguage();
  const [ping, setPing] = useState(0);
  const lastSound = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const trigger = () => {
    setPing((p) => p + 1);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPing(0), 1000);
    const now = Date.now();
    if (soundOn && now - lastSound.current > 180) {
      lastSound.current = now;
      playLilyNote();
    }
  };

  const dur = 2.6 + (i % 4) * 0.27;

  return (
    <button
      type="button"
      aria-label={t('isle.meadow.lilyAria', { n: i + 1 })}
      onMouseEnter={trigger}
      onFocus={trigger}
      className="relative block h-20 w-8 shrink-0 md:h-24 md:w-10"
    >
      <span
        className="ambient block h-full w-full"
        style={{
          animation: `isle-sway ${dur}s ease-in-out ${i * 0.23}s infinite`,
          transformOrigin: 'bottom center',
        }}
      >
        <LilySvg />
      </span>
      {ping > 0 && (
        <span key={ping} className="pointer-events-none absolute left-1/2 top-[22%]" aria-hidden>
          <span
            className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90"
            style={{ animation: 'st-wave-pulse 0.8s ease-out both' }}
          />
          <span
            className="absolute -left-2 -top-2 block h-4 w-4"
            style={{ animation: 'isle-note-float 0.9s ease-out both' }}
          >
            <NoteGlyph className="h-full w-full" color="#8FD3A8" />
          </span>
        </span>
      )}
    </button>
  );
}

/**
 * Section 2 — Arrival: the lily meadow. Two columns (55/45): quiet copy +
 * stat chips, isle postcard with tape caption, swaying lily border strip.
 */
export default function LilyMeadow({
  sectionRef,
}: {
  sectionRef?: RefObject<HTMLElement | null>;
}) {
  const { soundOn, collectStamp } = useTown();
  const { t } = useLanguage();
  const reduced = usePrefersReducedMotion();

  return (
    <section
      ref={sectionRef}
      aria-label={t('isle.meadow.sectionAria')}
      className="relative mx-auto max-w-[1200px] px-6 py-24 md:py-32"
    >
      <motion.div
        className="grid items-center gap-12 md:grid-cols-[55fr_45fr]"
        onViewportEnter={() => {
          /* stepping off the pier earns the isle stamp (passport contract) */
          if (collectStamp('windbell-isle')) {
            toast(t('isle.meadow.stampToast'), {
              description: t('isle.meadow.stampToastDesc'),
            });
          }
        }}
      >
        <div>
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral">
            {t('isle.meadow.kicker')}
          </p>
          <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
            <WordRise text={t('isle.meadow.title')} />
          </h2>
          <p className="mt-5 max-w-[54ch] text-[clamp(1rem,1.15vw,1.15rem)] font-semibold leading-[1.65] text-ink/90">
            <WordRise text={t('isle.meadow.body')} stagger={0.018} duration={0.5} />
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {CHIP_KEYS.map((key, i) => (
              <motion.span
                key={key}
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{
                  delay: reduced ? 0 : i * 0.1,
                  duration: 0.5,
                  ease: BACK_OUT,
                }}
                className="rounded-full border-2 border-white bg-paper px-4 py-2 text-sm font-extrabold text-ink shadow-pop"
              >
                {t(key)}
              </motion.span>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ x: 60, rotate: 3, opacity: 0 }}
          whileInView={{ x: 0, rotate: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: SQUASH }}
          className="sticker-card relative p-3"
        >
          <div className="relative overflow-hidden rounded-[20px]">
            <motion.img
              src="/scene-isle.png"
              alt={t('isle.meadow.sceneAlt')}
              loading="lazy"
              initial={{ scale: 1.06 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: SQUASH }}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="absolute -top-4 left-6 rotate-[-4deg] rounded-md bg-butter/90 px-3 py-1 font-hand text-xl leading-none text-ink shadow-sm">
            {t('isle.meadow.caption')}
          </span>
        </motion.div>
      </motion.div>

      {/* lily-of-the-valley border strip */}
      <div
        className="mt-14 flex items-end justify-between gap-1 overflow-hidden border-t-2 border-dashed border-ink/10 px-2 pt-2"
        aria-label={t('isle.meadow.borderAria')}
      >
        {Array.from({ length: 14 }, (_, i) => (
          <LilyStem key={i} i={i} soundOn={soundOn} />
        ))}
      </div>
    </section>
  );
}
