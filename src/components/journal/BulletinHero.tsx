import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_BACK_17, EASE_BACK_2, EASE_SQUASH } from './presets';
import { PinHead, TapeStrip } from './bits';

const TITLE = 'The Town Journal'.split('');

interface Ephemera {
  id: string;
  rest: number; // resting rotation deg
  drop: number; // drop-in rotation deg
  pin: string; // pin color
  className: string;
}

const EPHEMERA: Ephemera[] = [
  { id: 'tide', rest: -6, drop: -14, pin: '#7EC8E3', className: 'left-[3%] top-[14%] sm:left-[5%] sm:top-[17%]' },
  { id: 'ticket', rest: 5, drop: 13, pin: '#F4B942', className: 'right-[3%] top-[15%] sm:right-[6%] sm:top-[19%]' },
  { id: 'flower', rest: 4, drop: 12, pin: '#8FD3A8', className: 'bottom-[10%] left-[5%] hidden sm:block sm:bottom-[14%] sm:left-[8%]' },
  { id: 'polaroid', rest: -4, drop: -12, pin: '#FF9B9B', className: 'bottom-[8%] right-[4%] sm:bottom-[13%] sm:right-[9%]' },
];

export default function BulletinHero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative flex min-h-[88dvh] items-center justify-center overflow-hidden px-3 pb-10 pt-[100px] sm:px-6">
      {/* oversized corkboard panel */}
      <div
        className="grain absolute inset-3 overflow-hidden rounded-[32px] border-[3px] border-white bg-sand shadow-sticker sm:inset-5"
        aria-hidden
      >
        {/* halftone dots */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(74,68,112,0.10) 1.4px, transparent 1.5px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* washi-tape frame */}
        <TapeStrip className="-left-6 -top-2 h-8 w-28 -rotate-45" />
        <TapeStrip className="-right-6 -top-2 h-8 w-28 rotate-45" />
        <TapeStrip className="-bottom-2 -left-6 h-8 w-28 rotate-45" />
        <TapeStrip className="-bottom-2 -right-6 h-8 w-28 -rotate-45" />
        <TapeStrip className="left-1/2 top-2 h-6 w-24 -translate-x-1/2 rotate-1" />
        <TapeStrip className="bottom-2 left-[12%] h-6 w-20 -rotate-2" />
        <TapeStrip className="bottom-2 right-[14%] h-6 w-20 rotate-2" />
      </div>

      {/* drifting pressed petal — one crossing every 9s */}
      {!reduced && <PetalDrift />}

      {/* scattered pinned ephemera */}
      {EPHEMERA.map((e, i) => (
        <motion.div
          key={e.id}
          initial={reduced ? { opacity: 0 } : { y: -50, rotate: e.drop, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { y: 0, rotate: e.rest, opacity: 1 }}
          transition={
            reduced
              ? { delay: 0.3 + i * 0.06, duration: 0.4 }
              : { delay: 0.55 + i * 0.09, duration: 0.5, ease: EASE_BACK_2 }
          }
          className={`pointer-events-none absolute z-[6] ${e.className}`}
          aria-hidden
        >
          {/* pin wobbles after landing */}
          <motion.span
            className="absolute -top-3 left-1/2 z-10 -translate-x-1/2"
            animate={reduced ? undefined : { rotate: [0, -11, 8, -4, 0] }}
            transition={{ delay: 1.05 + i * 0.09, duration: 0.6, ease: 'easeInOut' }}
          >
            <PinHead color={e.pin} className="static" />
          </motion.span>
          {e.id === 'tide' && <TideChart />}
          {e.id === 'ticket' && <FerryTicket />}
          {e.id === 'flower' && <PressedFlower />}
          {e.id === 'polaroid' && <Polaroid />}
        </motion.div>
      ))}

      {/* center stack */}
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        <motion.p
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE_SQUASH }}
          className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral"
        >
          Vol. 34 · The Summer Edition
        </motion.p>

        {/* H1 — character spring (stagger 0.035s, y:70 scale:0.7→1, back.out(1.7)) */}
        <h1
          className="text-outline mt-4 flex flex-wrap justify-center font-display font-bold leading-[1.0] tracking-[-0.015em] text-ink"
          style={{ fontSize: 'clamp(2.75rem, 6vw, 5.5rem)' }}
          aria-label="The Town Journal"
        >
          {TITLE.map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={reduced ? { opacity: 0 } : { y: 70, scale: 0.7, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
              transition={
                reduced
                  ? { delay: 0.3 + i * 0.02, duration: 0.4 }
                  : { delay: 0.35 + i * 0.035, duration: 0.8, ease: EASE_BACK_17 }
              }
              className="inline-block"
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: reduced ? 0.6 : 1.05, duration: 0.6, ease: EASE_SQUASH }}
          className="mx-auto mt-5 max-w-xl text-lg font-semibold leading-[1.65] text-ink/85"
        >
          Fourteen landmarks, three festivals, one mysterious key. All documented, mostly
          accurately.
        </motion.p>

        <motion.p
          initial={{ y: 20, opacity: 0, rotate: -2 }}
          animate={{ y: 0, opacity: 1, rotate: -2 }}
          transition={{ delay: reduced ? 0.75 : 1.25, duration: 0.6, ease: EASE_SQUASH }}
          className="mt-4 inline-block bg-butter/60 px-4 py-1 font-hand text-[clamp(1.25rem,2vw,1.6rem)] text-ink"
          style={{ borderRadius: 4 }}
        >
          — maintained by the library, argued with by everyone
        </motion.p>
      </div>
    </section>
  );
}

/* ================= drifting pressed petal (isolated ambient loop) ================= */
const PetalDrift = memo(function PetalDrift() {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-[30%] z-[5]"
      initial={{ x: '-6vw' }}
      animate={{ x: '106vw' }}
      transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      <div className="ambient" style={{ animation: 'st-bob 3.2s ease-in-out infinite' }}>
        <svg width="26" height="18" viewBox="0 0 26 18">
          <path
            d="M2 12 C6 2 18 0 24 6 C20 14 8 18 2 12 Z"
            fill="#FFC3D0"
            stroke="#FF9B9B"
            strokeWidth="1.4"
          />
          <path d="M4 11 C10 8 16 6 22 6" fill="none" stroke="#FF9B9B" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
});

/* ================= ephemera illustrations ================= */

function TideChart() {
  return (
    <div className="w-[132px] bg-paper p-3 pt-5 shadow-sticker sm:w-[150px]" style={{ borderRadius: 6 }}>
      <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">Tide chart</p>
      <svg viewBox="0 0 120 64" className="mt-1 w-full">
        <path d="M4 20 Q18 8 32 20 T60 20 T88 20 T116 20" fill="none" stroke="#7EC8E3" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M4 36 Q18 26 32 36 T60 36 T88 36 T116 36" fill="none" stroke="#A5E3D8" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M4 52 Q18 44 32 52 T60 52 T88 52 T116 52" fill="none" stroke="#5FA8CF" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="98" cy="12" r="7" fill="#FFDD94" stroke="#4A4470" strokeWidth="1.6" />
      </svg>
      <p className="font-hand text-base leading-none text-ink-soft">high at 4:20, obviously</p>
    </div>
  );
}

function FerryTicket() {
  return (
    <div className="w-[136px] sm:w-[160px]" style={{ filter: 'drop-shadow(0 10px 24px rgba(74,68,112,0.14))' }}>
      <div
        className="bg-[#FFE9C9] px-4 py-3"
        style={{
          borderRadius: 10,
          WebkitMaskImage:
            'radial-gradient(circle 5px at 0 50%, transparent 5px, black 5.5px), radial-gradient(circle 5px at 100% 50%, transparent 5px, black 5.5px)',
          WebkitMaskComposite: 'source-in',
          maskImage:
            'radial-gradient(circle 5px at 0 50%, transparent 5px, black 5.5px), radial-gradient(circle 5px at 100% 50%, transparent 5px, black 5.5px)',
          maskComposite: 'intersect',
        }}
      >
        <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.18em] text-ink-soft">Ferry · Admit one</p>
        <p className="mt-1 font-display text-lg font-semibold leading-none text-ink">ISLE RUNNER</p>
        <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-ink/20 pt-2">
          <span className="font-hand text-lg leading-none text-coral">seat 7B</span>
          <span className="text-[0.6rem] font-extrabold text-ink-soft">NO REFUNDS*</span>
        </div>
      </div>
    </div>
  );
}

function PressedFlower() {
  return (
    <div className="w-[104px] rotate-0 bg-paper p-2.5 pt-5 shadow-sticker" style={{ borderRadius: 6 }}>
      <svg viewBox="0 0 80 88" className="w-full">
        <path d="M40 84 C40 60 38 40 40 18" fill="none" stroke="#8FD3A8" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M40 62 C30 58 24 50 24 42 C34 44 40 52 40 62 Z" fill="#BDEBD2" />
        <path d="M40 50 C50 46 56 38 56 30 C46 32 40 40 40 50 Z" fill="#BDEBD2" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M${34 + i * 3} ${20 - i * 2} q 3 -8 6 0 q 1 5 -3 6 q -4 -1 -3 -6 Z`}
            fill="#FFF9EF"
            stroke="#C6B6E8"
            strokeWidth="1.4"
          />
        ))}
      </svg>
      <p className="mt-1 text-center font-hand text-base leading-none text-ink-soft">lily of the valley</p>
      <TapeStrip className="left-1/2 top-1.5 h-4 w-16 -translate-x-1/2 rotate-1" />
    </div>
  );
}

function Polaroid() {
  return (
    <div className="w-[116px] bg-white p-2 pb-3 shadow-sticker sm:w-[132px]" style={{ borderRadius: 4 }}>
      <div className="overflow-hidden bg-lilac/50" style={{ borderRadius: 2 }}>
        <img src="/i-lighthouse.png" alt="" className="h-[104px] w-full object-cover sm:h-[120px]" loading="lazy" />
      </div>
      <p className="mt-1.5 text-center font-hand text-lg leading-none text-ink">sunset point!</p>
    </div>
  );
}
