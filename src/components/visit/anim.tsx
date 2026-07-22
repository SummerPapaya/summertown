import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';

/** signature "squash" easing (design.md §5) */
export const SQUASH = [0.22, 1.2, 0.36, 1] as [number, number, number, number];
/** ~back.out(1.6–1.7) for card deals + char springs */
export const BACK_OUT = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/**
 * H1 character-spring entrance (stagger 0.04s, back.out).
 * Full text is kept for screen readers; animated chars are aria-hidden.
 */
export function Chars({
  text,
  delay = 0.15,
}: {
  text: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay }}
      >
        {text}
      </motion.span>
    );
  }
  let charIndex = 0;
  const words = text.split(' ');
  return (
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, wi) => (
          <span key={wi} className="inline-block whitespace-nowrap">
            {word.split('').map((ch, ci) => {
              const d = delay + charIndex++ * 0.04;
              return (
                <motion.span
                  key={ci}
                  className="inline-block"
                  initial={{ y: 44, opacity: 0, scale: 0.6, rotate: -8 }}
                  animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: d, duration: 0.55, ease: BACK_OUT }}
                >
                  {ch}
                </motion.span>
              );
            })}
            {wi < words.length - 1 ? '\u00A0' : null}
          </span>
        ))}
      </span>
    </span>
  );
}

const wordVariants: Variants = {
  hidden: { y: '115%' },
  show: { y: 0, transition: { duration: 0.6, ease: SQUASH } },
};

/** H2 word-level masked rise on scroll into view (design.md §3) */
export function Words({
  text,
  delay = 0,
  once = true,
}: {
  text: string;
  delay?: number;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once, amount: 0.4 }}
        transition={{ duration: 0.4, delay }}
      >
        {text}
      </motion.span>
    );
  }
  const words = text.split(' ');
  return (
    <motion.span
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.4 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: delay } },
      }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span
            key={i}
            className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom"
          >
            <motion.span className="inline-block" variants={wordVariants}>
              {w}
            </motion.span>
            {i < words.length - 1 ? '\u00A0' : null}
          </span>
        ))}
      </span>
    </motion.span>
  );
}
