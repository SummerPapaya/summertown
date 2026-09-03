import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bird, Citrus, Flower2, Star, Sunset, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BACK_OUT, SQUASH, Words } from './anim';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface Stay {
  keyPrefix: string; // visit.stay.cards.0 / .1
  img: string;
  chipClass: string;
  amenityIcons: LucideIcon[];
  to: string;
  tilt: number;
}

const STAYS: Stay[] = [
  {
    keyPrefix: 'visit.stay.cards.0',
    img: '/scene-hotel.png',
    chipClass: 'bg-peach',
    amenityIcons: [Star, Sunset, Bird],
    to: '/?place=hotel',
    tilt: -2,
  },
  {
    keyPrefix: 'visit.stay.cards.1',
    img: '/scene-villas.png',
    chipClass: 'bg-mint',
    amenityIcons: [Citrus, Trophy, Flower2],
    to: '/?place=villas',
    tilt: 2,
  },
];

export default function WhereToStay() {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
  return (
    <section id="stay" className="mx-auto max-w-[1200px] scroll-mt-[100px] px-6 py-24">
      <div className="text-center">
        <p className="kicker text-coral">
          {t('visit.stay.kicker')}
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
          <Words text={t('visit.stay.title')} />
        </h2>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {STAYS.map((s, i) => (
          <motion.article
            key={s.keyPrefix}
            initial={reduced ? { opacity: 0 } : { y: 60, rotate: s.tilt, opacity: 0 }}
            whileInView={reduced ? { opacity: 1 } : { y: 0, rotate: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: i * 0.15, duration: 0.7, ease: SQUASH }}
            className="sticker-card group overflow-hidden p-4"
          >
            {/* thumbnail — slow zoom on hover */}
            <div className="relative h-[240px] overflow-hidden rounded-2xl bg-lilac/40">
              <img
                src={s.img}
                alt={t(`${s.keyPrefix}.alt`)}
                loading="lazy"
                className="h-full w-full object-cover transition-transform [transition-duration:600ms] ease-squash group-hover:scale-[1.06]"
              />
              <span
                className={cn(
                  'absolute left-4 top-4 rounded-full border-[3px] border-white px-3.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ink shadow-sm',
                  s.chipClass,
                )}
              >
                {t('visit.stay.chip')}
              </span>
            </div>

            <div className="p-5">
              <h3 className="font-display text-[clamp(1.35rem,2vw,1.75rem)] font-semibold text-ink">
                {t(`${s.keyPrefix}.name`)}
              </h3>
              <p className="mt-0.5 font-hand text-2xl leading-tight text-coral">{t(`${s.keyPrefix}.tagline`)}</p>
              <p className="mt-3 font-semibold leading-relaxed text-ink/80">{t(`${s.keyPrefix}.blurb`)}</p>

              {/* amenity icons pop in staggered when the card enters */}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                {s.amenityIcons.map((Icon, ai) => (
                  <motion.span
                    key={ai}
                    initial={{ scale: 0, rotate: -20, opacity: 0 }}
                    whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      delay: 0.35 + i * 0.15 + ai * 0.05,
                      duration: 0.45,
                      ease: BACK_OUT,
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-cream shadow-sm">
                      <Icon className="h-4 w-4 text-ink" />
                    </span>
                    <span className="text-xs font-extrabold text-ink-soft">{t(`${s.keyPrefix}.amenities.${ai}`)}</span>
                  </motion.span>
                ))}
              </div>

              <Link to={s.to} className="btn-primary mt-6 px-5 py-2.5 text-sm">
                {t('visit.stay.bookCta')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>

      {/* budget option — slides up last */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 0.35, duration: 0.5, ease: SQUASH }}
        className="mt-10 flex justify-center"
      >
        <Link
          to="/?place=library"
          className="relative block max-w-xl -rotate-1 rounded-lg border-[3px] border-white bg-butter/60 px-8 py-5 text-center shadow-sticker transition-transform duration-300 ease-squash hover:rotate-0 hover:scale-[1.02]"
        >
          <span
            className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-butter/80"
            aria-hidden
          />
          <p className="font-hand text-2xl leading-snug text-ink">
            {t('visit.stay.budget')}
          </p>
        </Link>
      </motion.div>
    </section>
  );
}
