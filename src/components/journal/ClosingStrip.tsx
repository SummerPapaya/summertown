import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { EASE_BACK_156, EASE_SQUASH } from './presets';
import { PaperBoat } from './bits';

export default function ClosingStrip() {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
  const line = t('journal.closing.line').split(' ');

  return (
    <section className="relative overflow-hidden px-6 pb-28 pt-10 text-center">
      {/* big handwritten line — word rise */}
      <p
        className="flex flex-wrap justify-center gap-x-[0.35em] font-hand text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.15] text-ink"
        aria-label={t('journal.closing.line')}
      >
        {line.map((w, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={reduced ? { opacity: 0 } : { y: 26, opacity: 0 }}
            whileInView={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: i * 0.07, duration: 0.5, ease: EASE_SQUASH }}
            className="inline-block"
          >
            {w}
          </motion.span>
        ))}
      </p>

      {/* CTAs — pop stagger */}
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <motion.div
          initial={reduced ? { opacity: 0 } : { scale: 0.6, y: 20, opacity: 0 }}
          whileInView={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.35, duration: 0.5, ease: EASE_BACK_156 }}
        >
          <Link to="/" className="btn-primary text-base">
            {t('journal.closing.returnMap')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <motion.div
          initial={reduced ? { opacity: 0 } : { scale: 0.6, y: 20, opacity: 0 }}
          whileInView={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.45, duration: 0.5, ease: EASE_BACK_156 }}
        >
          <Link to="/visit" className="btn-secondary text-base">
            {t('journal.closing.planVisit')}
          </Link>
        </motion.div>
      </div>

      {/* paper boat sails across — repeats on viewport re-entry */}
      {!reduced && (
        <div className="pointer-events-none relative mx-auto mt-14 h-[34px] max-w-[720px]" aria-hidden>
          <motion.div
            className="absolute left-0 top-0"
            initial={{ x: -60 }}
            whileInView={{ x: 720 }}
            viewport={{ once: false, amount: 0.8 }}
            transition={{ duration: 6, ease: 'linear' }}
          >
            <div style={{ animation: 'st-bob 2.4s ease-in-out infinite' }} className="ambient">
              <PaperBoat size={42} />
            </div>
          </motion.div>
          {/* dashed wake */}
          <svg className="absolute inset-x-0 bottom-0 w-full" height="8" preserveAspectRatio="none" viewBox="0 0 720 8">
            <path
              d="M0 4 Q 30 1 60 4 T 120 4 T 180 4 T 240 4 T 300 4 T 360 4 T 420 4 T 480 4 T 540 4 T 600 4 T 660 4 T 720 4"
              fill="none"
              stroke="var(--lagoon)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="2 8"
            />
          </svg>
        </div>
      )}
    </section>
  );
}
