import { motion } from 'framer-motion';
import { SQUASH, usePrefersReducedMotion } from './hooks';

/**
 * Page-scoped keyframes for the isle. Every looping element ALSO carries the
 * global `ambient` class, so the prefers-reduced-motion rule in index.css
 * disables all loops; pins/scrubs are gated in JS via usePrefersReducedMotion.
 */
export function IsleStyles() {
  return (
    <style>{`
      @keyframes isle-sway { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
      @keyframes isle-wish-sway { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
      @keyframes isle-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
      @keyframes isle-shimmer { 0%,100% { opacity: .12; } 50% { opacity: .4; } }
      @keyframes isle-glow { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
      @keyframes isle-note-float {
        0% { opacity: 0; transform: translateY(4px) scale(.6) rotate(-8deg); }
        22% { opacity: 1; }
        75% { opacity: 1; transform: translateY(-20px) scale(1) rotate(6deg); }
        100% { opacity: 0; transform: translateY(-30px) scale(1.25) rotate(10deg); }
      }
      .isle-beam-loop { animation: st-beam 14s linear infinite; }
    `}</style>
  );
}

/** Word-level rise-in (design motion language: word stagger on enter). */
export function WordRise({
  text,
  className,
  delay = 0,
  stagger = 0.045,
  duration = 0.6,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const words = text.split(' ');
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduced ? 0 : stagger,
            delayChildren: delay,
          },
        },
      }}
    >
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block will-change-transform"
          variants={{
            hidden: { y: reduced ? 0 : 26, opacity: 0 },
            show: {
              y: 0,
              opacity: 1,
              transition: { duration: reduced ? 0.01 : duration, ease: SQUASH },
            },
          }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Tiny music-note glyph (SVG, never emoji) for chime bubbles. */
export function NoteGlyph({
  className,
  color = '#FF9B9B',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M9 18.5a3.2 3.2 0 1 1-2-3.02V5.4c0-.5.34-.93.83-1.06l8-2.1A1.1 1.1 0 0 1 17.2 3.3v11.4a3.2 3.2 0 1 1-2-3.02V7.6l-6.2 1.63v9.27Z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.4"
      />
    </svg>
  );
}
