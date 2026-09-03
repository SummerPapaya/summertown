import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Ship, Star } from 'lucide-react';
import { useTown } from '@/lib/town';
import { useLanguage } from '@/lib/i18n';
import { playChime } from '@/lib/sound';
import { BACK_OUT, SQUASH, Words } from './anim';
import { MiniFerry, Postmark, WaveUnderline } from './doodles';
import { cn } from '@/lib/utils';

const ROWS = [
  { tideKey: 'visit.ferry.rows.0', out: '08:10', back: '09:00', golden: false },
  { tideKey: 'visit.ferry.rows.1', out: '12:20', back: '13:05', golden: false },
  { tideKey: 'visit.ferry.rows.2', out: '17:40', back: '18:25', golden: true },
];

const rowGrid =
  'grid grid-cols-[1.15fr_1fr_1fr_44px] items-center gap-x-3 rounded-2xl px-4 py-3.5';

export default function FerryTimetable() {
  const { time, setTime, soundOn } = useTown();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const chooseGolden = () => {
    setTime('golden');
    if (soundOn) playChime();
    toast(t('visit.ferry.goldenToast'), {
      description: t('visit.ferry.goldenToastDesc'),
    });
  };

  return (
    <section id="ferry" className="mx-auto max-w-[1200px] scroll-mt-[100px] px-6 py-24">
      <div className="text-center">
        <p className="kicker text-coral">
          {t('visit.ferry.kicker')}
        </p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
          <Words text={t('visit.ferry.title')} />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: 0.35, duration: 0.5, ease: SQUASH }}
          className="mt-1 font-hand text-2xl text-ink-soft"
        >
          {t('visit.ferry.hand')}
        </motion.p>
      </div>

      <div className="mt-12 flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-start">
        {/* ---- timetable sticker card ---- */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: SQUASH }}
          className="sticker-card w-full max-w-[760px] p-5 md:p-8"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-lagoon/50">
              <Ship className="h-5 w-5 text-ink" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-ink">
                {t('visit.ferry.company')}
              </p>
              <p className="text-xs font-bold text-ink-soft">
                {t('visit.ferry.companySub')}
              </p>
            </div>
          </div>

          {/* horizontal scroll on <768px (min-width 560px per design) */}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]" role="group" aria-label={t('visit.ferry.tableAria')}>
              {/* header row */}
              <div
                className={cn(
                  rowGrid,
                  'pb-2 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ink-soft',
                )}
                aria-hidden
              >
                <span>{t('visit.ferry.thTide')}</span>
                <span>{t('visit.ferry.thOut')}</span>
                <span>{t('visit.ferry.thBack')}</span>
                <span />
              </div>

              <div className="mt-1 flex flex-col gap-2">
                {ROWS.map((r, i) => {
                  const Inner = (
                    <>
                      <span className="font-extrabold text-ink">
                        {t(r.tideKey)}
                        {r.golden && (
                          <span className="mt-0.5 flex items-center gap-1 font-hand text-lg font-bold leading-none text-coral">
                            <Star className="h-3.5 w-3.5 fill-coral" /> {t('visit.ferry.theGoodOne')}
                          </span>
                        )}
                      </span>
                      <span className="font-display text-xl font-semibold tabular-nums text-ink">
                        {r.out}
                      </span>
                      <span className="font-display text-xl font-semibold tabular-nums text-ink">
                        {r.back}
                      </span>
                      <MiniFerry className="vt-mini-ferry h-8 w-11" />
                    </>
                  );
                  const motionProps = reduced
                    ? {
                        initial: { opacity: 0 },
                        whileInView: { opacity: 1 },
                        viewport: { once: true, amount: 0.6 },
                        transition: { delay: 0.15 + i * 0.08, duration: 0.4 },
                      }
                    : {
                        initial: { x: -24, opacity: 0 },
                        whileInView: { x: 0, opacity: 1 },
                        viewport: { once: true, amount: 0.6 },
                        transition: { delay: 0.15 + i * 0.08, duration: 0.5, ease: SQUASH },
                      };
                  return r.golden ? (
                    <motion.button
                      key={r.tideKey}
                      type="button"
                      onClick={chooseGolden}
                      aria-pressed={time === 'golden'}
                      title={t('visit.ferry.goldenTitle')}
                      className={cn(
                        'vt-row w-full cursor-pointer border-[3px] border-white bg-butter/80 text-left shadow-sm transition-transform duration-300 ease-squash hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral',
                        rowGrid,
                      )}
                      {...motionProps}
                    >
                      {Inner}
                    </motion.button>
                  ) : (
                    <motion.div key={r.tideKey} className={cn('vt-row bg-white/45', rowGrid)} {...motionProps}>
                      {Inner}
                    </motion.div>
                  );
                })}
              </div>

              {/* footnote — fades in last with wave-underline draw */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="mt-5 inline-block"
              >
                <p className="text-sm font-bold text-ink-soft">
                  {t('visit.ferry.footnoteA')} <span className="font-display text-base text-ink">21:50</span> —{' '}
                  {t('visit.ferry.footnoteB')}
                </p>
                <WaveUnderline className="mt-1 h-2.5 w-full max-w-[260px]" delay={0.7} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ---- fare card — deals in rotate 8° → 2° (fades if reduced motion) ---- */}
        <motion.aside
          initial={reduced ? { opacity: 0 } : { rotate: 8, y: 40, opacity: 0 }}
          whileInView={reduced ? { opacity: 1 } : { rotate: 2, y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: BACK_OUT }}
          className="sticker-card relative w-full max-w-[300px] shrink-0 p-6"
        >
          <Postmark className="absolute -right-4 -top-4 h-16 w-16 rotate-12 text-coral/70" />
          <h3 className="font-display text-xl font-semibold text-ink">{t('visit.ferry.faresTitle')}</h3>
          <p className="font-hand text-xl leading-none text-ink-soft">{t('visit.ferry.faresPer')}</p>
          <ul className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-ink/10 pb-2 last:border-0"
              >
                <span className="text-sm font-extrabold text-ink">{t(`visit.ferry.fares.${i}.0`)}</span>
                <span className="font-hand text-xl text-ink-soft">{t(`visit.ferry.fares.${i}.1`)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-hand text-lg leading-snug text-ink-soft">
            {t('visit.ferry.faresFoot')}
          </p>
        </motion.aside>
      </div>
    </section>
  );
}
