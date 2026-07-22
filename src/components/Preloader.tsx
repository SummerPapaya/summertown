import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LETTERS = ['S', 'U', 'M', 'M', 'E', 'R'];

/**
 * Section 0 — Preloader (1.4s, once per session).
 * Wave line draws itself; logo bobs; whole loader exits upward.
 */
export default function Preloader() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('st-loaded');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      setShow(false);
      try {
        sessionStorage.setItem('st-loaded', '1');
      } catch {
        /* ignore */
      }
    }, 1450);
    return () => window.clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9000] flex flex-col items-center justify-center bg-cream"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.img
            src="/logo.svg"
            alt="Summer Town"
            className="h-24 w-24"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* self-drawing wave line */}
          <svg width="160" height="24" viewBox="0 0 160 24" className="mt-4">
            <motion.path
              d="M4 12 Q 20 2 36 12 T 68 12 T 100 12 T 132 12 T 156 12"
              fill="none"
              stroke="var(--lagoon)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            />
          </svg>
          <div className="mt-3 flex gap-1" aria-hidden>
            {LETTERS.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.35 + i * 0.05,
                  duration: 0.4,
                  ease: [0.22, 1.2, 0.36, 1],
                }}
                className="font-display text-sm font-semibold tracking-[0.3em] text-ink-soft"
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <p className="mt-2 font-hand text-2xl text-ink-soft">the ferry is almost there…</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
