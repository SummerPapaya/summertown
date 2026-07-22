import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, BedDouble } from 'lucide-react';
import { Chars, SQUASH } from './anim';
import { CloudSvg, GullSvg } from './doodles';

/* Ambient loops are isolated + memoized so parent re-renders can't reset them
   (react-dev.md performance rules). All carry `.ambient` → reduced-motion off. */

const Clouds = memo(function Clouds() {
  const clouds = [
    { top: '10%', width: 180, dur: 45, delay: -12, opacity: 0.95 },
    { top: '24%', width: 120, dur: 70, delay: -48, opacity: 0.8 },
    { top: '5%', width: 230, dur: 45, delay: -34, opacity: 0.9 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {clouds.map((c, i) => (
        <div
          key={i}
          className="ambient absolute left-0"
          style={{
            top: c.top,
            width: c.width,
            opacity: c.opacity,
            animation: `vt-cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
          }}
        >
          <CloudSvg className="w-full" />
        </div>
      ))}
    </div>
  );
});

const Gull = memo(function Gull() {
  return (
    <div
      className="ambient pointer-events-none absolute left-0 top-[16%]"
      style={{ animation: 'vt-gull-cross 11s linear infinite', opacity: 0 }}
      aria-hidden
    >
      <GullSvg className="h-4 w-9" />
    </div>
  );
});

const FerryFloat = memo(function FerryFloat() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div
        className="ambient relative z-10"
        style={{ animation: 'vt-ferry-bob 3.8s ease-in-out infinite' }}
      >
        <img
          src="/ferry.png"
          alt="The M.V. Bellweather — a cheerful pastel ferry with a striped awning"
          className="w-full drop-shadow-[0_18px_24px_rgba(74,68,112,0.18)]"
        />
      </div>
      {/* looping wake — 3 ellipses, expanding + fading, staggered */}
      {[0, 0.8, 1.6].map((d) => (
        <span
          key={d}
          className="ambient absolute bottom-[2%] left-1/2 -ml-[70px] h-[26px] w-[140px] rounded-[50%] border-[3px] border-white/80"
          style={{ animation: `vt-wake 2.4s ease-out ${d}s infinite`, opacity: 0 }}
          aria-hidden
        />
      ))}
    </div>
  );
});

const WaveBand = memo(function WaveBand() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden" aria-hidden>
      <svg
        className="ambient absolute bottom-0 left-0 h-20 w-[200%] animate-[st-wave-drift_9s_linear_infinite_alternate]"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <path
          d="M0 50 Q60 18 120 50 T240 50 T360 50 T480 50 T600 50 T720 50 T840 50 T960 50 T1080 50 T1200 50 T1320 50 T1440 50 V80 H0 Z"
          fill="var(--lagoon)"
          opacity="0.5"
        />
      </svg>
      <svg
        className="ambient absolute bottom-0 left-0 h-14 w-[200%] animate-[st-wave-drift_7s_linear_infinite_alternate]"
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
      >
        <path
          d="M0 34 Q60 6 120 34 T240 34 T360 34 T480 34 T600 34 T720 34 T840 34 T960 34 T1080 34 T1200 34 T1320 34 T1440 34 V56 H0 Z"
          fill="var(--seafoam)"
        />
      </svg>
    </div>
  );
});

export default function Hero() {
  const reduced = useReducedMotion();
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section className="relative -mt-[88px] flex min-h-[92dvh] flex-col overflow-hidden pt-[88px]">
      {/* sky gradient — repainted by the global time-of-day theme */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom) 68%, var(--seafoam))',
        }}
        aria-hidden
      />
      <Clouds />
      <Gull />
      <WaveBand />

      <div className="relative z-10 mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-10 px-6 pb-28 pt-10 lg:grid-cols-[55fr_45fr]">
        {/* left 55% — copy + CTAs */}
        <div>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: SQUASH }}
            className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral"
          >
            Harbor Office · Window 1
          </motion.p>

          <h1 className="mt-3 font-display text-[clamp(2.75rem,6vw,5.5rem)] font-bold leading-[1.0] tracking-[-0.015em] text-ink">
            <Chars text="Plan your visit" />
          </h1>

          <motion.p
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6, ease: SQUASH }}
            className="mt-5 max-w-md text-lg font-semibold leading-relaxed text-ink/85"
          >
            One ferry, one tide, zero reasons to rush. Here&rsquo;s everything
            the harbor master tells everyone,{' '}
            <span className="font-hand text-2xl text-ink">verbatim.</span>
          </motion.p>

          <div className="mt-8 flex flex-wrap gap-4">
            <motion.button
              type="button"
              onClick={() => scrollTo('ferry')}
              initial={{ y: 24, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.75, duration: 0.5, ease: SQUASH }}
              className="btn-primary"
            >
              Check the ferry <ArrowDown className="h-4 w-4" />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => scrollTo('stay')}
              initial={{ y: 24, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.87, duration: 0.5, ease: SQUASH }}
              className="btn-secondary"
            >
              Where to stay <BedDouble className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* right 45% — ferry floating on the wave band */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8, ease: SQUASH }}
          className="relative"
        >
          <FerryFloat />
        </motion.div>
      </div>
    </section>
  );
}
