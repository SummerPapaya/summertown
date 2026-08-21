import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Radio, Send } from 'lucide-react';
import { LANDMARKS } from '@/lib/landmarks';
import { useTown } from '@/lib/town';
import { useLanguage } from '@/lib/i18n';
import { playStatic } from '@/lib/sound';
import { trpc } from '@/providers/trpc';

const EXPLORE = [
  { to: '/', labelKey: 'nav.map' },
  { to: '/windbell-isle', labelKey: 'nav.isle' },
  { to: '/journal', labelKey: 'nav.journal' },
  { to: '/visit', labelKey: 'nav.visit' },
];

const TOP_LANDMARKS = ['town-hall', 'theater', 'coffee', 'radio', 'windbell-isle'];

export default function Footer() {
  const { soundOn } = useTown();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const subscribe = trpc.town.subscribe.useMutation();

  return (
    <footer className="relative mt-0">
      {/* animated wave edge */}
      <div className="relative h-16 overflow-hidden" aria-hidden>
        <svg
          className="ambient absolute bottom-0 left-0 h-16 w-[200%] animate-[st-wave-drift_8s_linear_infinite_alternate]"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
        >
          <path
            d="M0 40 Q60 8 120 40 T240 40 T360 40 T480 40 T600 40 T720 40 T840 40 T960 40 T1080 40 T1200 40 T1320 40 T1440 40 V64 H0 Z"
            fill="var(--seafoam)"
          />
        </svg>
      </div>

      <div className="bg-gradient-to-b from-seafoam to-lagoon">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-16 md:grid-cols-[1.2fr_1fr_1.2fr]">
          {/* brand */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.22, 1.2, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="h-12 w-12" />
              <span className="font-display text-2xl font-semibold text-ink">{t('nav.brand')}</span>
            </div>
            <p className="mt-3 font-hand text-2xl text-ink">{t('footer.tagline')}</p>
            <p className="mt-3 text-xs font-semibold text-ink/70">
              {t('footer.population')}
            </p>
          </motion.div>

          {/* links */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1.2, 0.36, 1] }}
            className="grid grid-cols-2 gap-6"
          >
            <div>
              <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink/70">
                {t('footer.explore')}
              </h3>
              <ul className="mt-3 space-y-2">
                {EXPLORE.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-bold text-ink transition-colors hover:text-white">
                      {t(l.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink/70">
                {t('footer.landmarks')}
              </h3>
              <ul className="mt-3 space-y-2">
                {TOP_LANDMARKS.map((id) => {
                  const lm = LANDMARKS.find((l) => l.id === id)!;
                  return (
                    <li key={id}>
                      <Link
                        to={`/?place=${id}`}
                        className="text-sm font-bold text-ink transition-colors hover:text-white"
                      >
                        {t(lm.nameKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>

          {/* postcards signup */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1.2, 0.36, 1] }}
          >
            <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink/70">
              {t('footer.newsletter.title')}
            </h3>
            <p className="mt-2 text-sm font-semibold text-ink/80">
              {t('footer.newsletter.body')}
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = email.trim();
                if (!value) return;
                setSent(true);
                // Static builds have no backend: network failures stay silent
                // and the success note above still shows.
                subscribe.mutate({ email: value }, { onError: () => undefined });
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.newsletter.placeholder')}
                className="w-full rounded-full border-[3px] border-white bg-cream px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-soft/60 focus:outline-none"
              />
              <button type="submit" className="btn-primary shrink-0 px-4 py-2.5 text-sm">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{t('footer.newsletter.button')}</span>
              </button>
            </form>
            {sent && (
              <p className="mt-2 font-hand text-xl text-ink">{t('footer.newsletter.success')}</p>
            )}
          </motion.div>
        </div>

        <div className="border-t border-white/40">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs font-bold text-ink/80">
            <span>{t('footer.copyright')}</span>
            <button
              type="button"
              onMouseEnter={() => {
                if (soundOn) playStatic();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/40 px-3 py-1.5 transition-transform duration-300 ease-squash hover:scale-105"
              title="105.5 Summer FM"
            >
              <Radio className="h-3.5 w-3.5" />
              105.5 Summer FM
            </button>
            <span>{t('footer.bottomLine')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
