import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Radio, Send } from 'lucide-react';
import { LANDMARKS } from '@/lib/landmarks';
import { useTown } from '@/lib/town';
import { playStatic } from '@/lib/sound';

const EXPLORE = [
  { to: '/', label: 'Map' },
  { to: '/windbell-isle', label: 'Windbell Isle' },
  { to: '/journal', label: 'Journal' },
  { to: '/visit', label: 'Visit' },
];

const TOP_LANDMARKS = ['town-hall', 'theater', 'coffee', 'radio', 'windbell-isle'];

export default function Footer() {
  const { soundOn } = useTown();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

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
              <span className="font-display text-2xl font-semibold text-ink">Summer Town</span>
            </div>
            <p className="mt-3 font-hand text-2xl text-ink">Made of sea salt &amp; sunlight.</p>
            <p className="mt-3 text-xs font-semibold text-ink/70">
              Pop. 214 (plus one very serious seagull)
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
                Explore
              </h3>
              <ul className="mt-3 space-y-2">
                {EXPLORE.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-bold text-ink transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink/70">
                Landmarks
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
                        {lm.name}
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
              Postcards from Summer Town
            </h3>
            <p className="mt-2 text-sm font-semibold text-ink/80">
              One breezy letter a month. No seagull spam.
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@somewhere.sea"
                className="w-full rounded-full border-[3px] border-white bg-cream px-4 py-2.5 text-sm font-bold text-ink placeholder:text-ink-soft/60 focus:outline-none"
              />
              <button type="submit" className="btn-primary shrink-0 px-4 py-2.5 text-sm">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Stamp it</span>
              </button>
            </form>
            {sent && (
              <p className="mt-2 font-hand text-xl text-ink">Sealed with a shell — see you in the mail!</p>
            )}
          </motion.div>
        </div>

        <div className="border-t border-white/40">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs font-bold text-ink/80">
            <span>© Summer Town</span>
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
            <span>14 landmarks · 1 long pier</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
