import { motion, useReducedMotion } from 'framer-motion';
import type { ComponentType } from 'react';
import { BACK_OUT, Words } from './anim';
import { CatDoodle, ShellDoodle, SparkleDoodle, SunHandsDoodle } from './doodles';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface Rule {
  keyPrefix: string; // visit.etiquette.rules.N
  Icon: ComponentType<{ className?: string }>;
  badge: string;
  tilt: number;
}

const RULES: Rule[] = [
  { keyPrefix: 'visit.etiquette.rules.0', Icon: CatDoodle, badge: 'bg-rose/60', tilt: -1.5 },
  { keyPrefix: 'visit.etiquette.rules.1', Icon: ShellDoodle, badge: 'bg-lagoon/50', tilt: 1.5 },
  { keyPrefix: 'visit.etiquette.rules.2', Icon: SunHandsDoodle, badge: 'bg-butter/70', tilt: -1.5 },
  { keyPrefix: 'visit.etiquette.rules.3', Icon: SparkleDoodle, badge: 'bg-lavender/50', tilt: 1.5 },
];

export default function Etiquette() {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-[980px] px-6 py-24">
      <div className="text-center">
        <p className="kicker text-coral">
          {t('visit.etiquette.kicker')}
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
          <Words text={t('visit.etiquette.title')} />
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {RULES.map((r, i) => {
          /* deal in like a hand of cards — from center to grid positions;
             reduced motion: simple fade (design/visit.md §Responsive) */
          const fromX = i % 2 === 0 ? 90 : -90;
          return (
            <motion.div
              key={r.keyPrefix}
              initial={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.8, rotate: 15, x: fromX, y: 40 }
              }
              whileInView={
                reduced
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, rotate: r.tilt, x: 0, y: 0 }
              }
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: BACK_OUT }}
              whileHover={reduced ? undefined : { rotate: 0, scale: 1.03 }}
              className="vt-rule-card sticker-card p-7 text-center"
              tabIndex={0}
            >
              <span
                className={cn(
                  'vt-rule-icon mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white shadow-sm',
                  r.badge,
                )}
              >
                <r.Icon className="h-12 w-12" />
              </span>
              <h3 className="mt-4 font-display text-[clamp(1.35rem,2vw,1.75rem)] font-semibold text-ink">
                {t(`${r.keyPrefix}.title`)}
              </h3>
              <p className="mt-2 font-semibold leading-relaxed text-ink/80">{t(`${r.keyPrefix}.body`)}</p>
              <p className="mt-3 font-hand text-xl leading-snug text-ink-soft">{t(`${r.keyPrefix}.foot`)}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
