import { useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Mail, Stamp } from 'lucide-react';
import { BACK_OUT, SQUASH, Words } from './anim';
import { Postmark } from './doodles';
import { useLanguage } from '@/lib/i18n';

const INGREDIENT_KEYS = [0, 1, 2, 3, 4];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Postcards() {
  const reduced = useReducedMotion();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const subscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(t('visit.postcards.error'));
      return;
    }
    setError('');
    setSent(true);
  };

  return (
    <section className="mx-auto max-w-[1100px] px-6 pb-28 pt-24">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: SQUASH }}
        className="sticker-card grid overflow-hidden md:grid-cols-[3fr_2fr]"
      >
        {/* ---- left: postcard signup ---- */}
        <div className="p-8 md:p-12">
          <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral">
            {t('visit.postcards.kicker')}
          </p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-ink">
            <Words text={t('visit.postcards.title')} />
          </h2>
          <p className="mt-3 max-w-md font-semibold leading-relaxed text-ink/80">
            {t('visit.postcards.body')}
          </p>

          <div className="mt-8" style={{ perspective: 900 }}>
            <AnimatePresence mode="wait" initial={false}>
              {sent ? (
                /* stamped postcard success state */
                <motion.div
                  key="stamped"
                  initial={reduced ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  aria-live="polite"
                  className="relative max-w-md rounded-2xl border-[3px] border-white bg-cream p-6 shadow-inner"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 1.6, rotate: -18 }}
                    animate={{ opacity: 1, scale: 1, rotate: -12 }}
                    transition={{ delay: 0.15, duration: 0.45, ease: BACK_OUT }}
                    className="absolute -right-3 -top-3 text-coral/80"
                  >
                    <Postmark className="h-20 w-20" />
                  </motion.div>
                  <p className="font-hand text-3xl leading-snug text-ink">
                    {t('visit.postcards.successTitle')}
                  </p>
                  <p className="mt-2 font-semibold text-ink/80">
                    {t('visit.postcards.successBody')}
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={subscribe}
                  noValidate
                  initial={reduced ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="max-w-md"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor="postcard-email" className="sr-only">
                      {t('visit.postcards.emailLabel')}
                    </label>
                    <div className="relative min-w-[220px] flex-1">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <input
                        id="postcard-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('visit.postcards.placeholder')}
                        autoComplete="email"
                        aria-invalid={!!error}
                        aria-describedby={error ? 'postcard-error' : undefined}
                        className="w-full rounded-full border-[3px] border-white bg-cream py-3 pl-11 pr-4 font-bold text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-coral"
                      />
                    </div>
                    {/* stamp-shaped subscribe button */}
                    <button type="submit" className="btn-primary px-5 py-3">
                      <Stamp className="h-4 w-4" /> {t('visit.postcards.subscribe')}
                    </button>
                  </div>
                  <p id="postcard-error" aria-live="polite" className="mt-2 min-h-[1.5rem] font-hand text-xl text-coral">
                    {error}
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ---- right: colophon ---- */}
        <div className="relative border-t-[3px] border-white bg-lilac/50 p-8 md:border-l-[3px] md:border-t-0 md:p-10">
          <Postmark className="absolute right-6 top-6 h-14 w-14 rotate-12 text-ink/20" />
          <h3 className="font-hand text-3xl font-bold text-ink">{t('visit.postcards.madeOf')}</h3>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {INGREDIENT_KEYS.map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -10, opacity: 0 }}
                whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.4, ease: BACK_OUT }}
                className="rounded-full border-2 border-white bg-cream px-3.5 py-1.5 text-xs font-extrabold text-ink shadow-sm"
              >
                {t(`visit.postcards.ingredients.${i}`)}
              </motion.span>
            ))}
          </div>
          <p className="mt-8 text-xs font-semibold leading-relaxed text-ink-soft">
            {t('visit.postcards.colophon')}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
