import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { motion } from 'framer-motion';
import { Sun, Sunset, Moon, Shell, VolumeX } from 'lucide-react';
import { useTown } from '@/lib/town';
import type { TimeOfDay } from '@/lib/town';
import { useLanguage } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { playChime } from '@/lib/sound';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/', labelKey: 'nav.map' },
  { to: '/windbell-isle', labelKey: 'nav.isle' },
  { to: '/journal', labelKey: 'nav.journal' },
  { to: '/visit', labelKey: 'nav.visit' },
];

const TIMES: { id: TimeOfDay; icon: typeof Sun; labelKey: string }[] = [
  { id: 'day', icon: Sun, labelKey: 'nav.time.day' },
  { id: 'golden', icon: Sunset, labelKey: 'nav.time.golden' },
  { id: 'starlight', icon: Moon, labelKey: 'nav.time.starlight' },
];

const LANGS: { id: Language; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'zh', label: '中文' },
];

const pill =
  'flex items-center gap-2 rounded-full border-[3px] border-white bg-[rgba(255,249,239,0.75)] shadow-sticker backdrop-blur-[12px]';

export default function Navbar() {
  const { time, setTime, soundOn, toggleSound, mapDetailOpen } = useTown();
  const { lang, setLang, t } = useLanguage();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 120 && y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4 || y <= 120) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tucked = hidden || mapDetailOpen;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: tucked ? '-130%' : 0, opacity: tucked ? 0 : 1 }}
      transition={{
        duration: tucked ? 0.4 : 0.6,
        delay: tucked ? 0 : 0.2,
        ease: [0.22, 1.2, 0.36, 1] as [number, number, number, number],
      }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[5000] grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-4"
    >
      {/* left: logo pill */}
      <Link to="/" className={cn(pill, 'pointer-events-auto w-fit justify-self-start px-4 py-2')}>
        <img src="/logo.svg" alt={t('nav.logoAlt')} className="h-9 w-9" />
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          {t('nav.brand')}
        </span>
      </Link>

      {/* center: nav pill */}
      <nav
        className={cn(pill, 'pointer-events-auto hidden justify-self-center px-2 py-1.5 md:flex')}
        aria-label={t('nav.mainNav')}
      >
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              cn(
                'relative rounded-full px-4 py-1.5 text-[0.82rem] font-extrabold tracking-wide text-ink transition-all duration-300 ease-squash hover:bg-white/70',
                isActive && 'bg-white/90',
              )
            }
          >
            {({ isActive }) => (
              <span className="relative inline-flex items-center gap-1.5">
                {isActive && <span className="h-2 w-2 rounded-full bg-coral" aria-hidden />}
                {t(l.labelKey)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* right: language + time + sound pill */}
      <div className={cn(pill, 'pointer-events-auto w-fit justify-self-end px-2 py-1.5')}>
        <div role="group" aria-label={t('nav.language')} className="flex items-center gap-1 rounded-full bg-white/60 p-1">
          {LANGS.map((l) => {
            const active = lang === l.id;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={active}
                onClick={() => setLang(l.id)}
                className={cn(
                  'flex h-8 items-center justify-center rounded-full px-2 text-[0.78rem] font-extrabold transition-all duration-300 ease-squash',
                  active ? 'scale-110 bg-butter text-ink shadow-sm' : 'text-ink-soft hover:scale-105 hover:bg-white',
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label={t('nav.timeOfDay')} className="flex items-center gap-1 rounded-full bg-white/60 p-1">
          {TIMES.map((time_) => {
            const Icon = time_.icon;
            const active = time === time_.id;
            return (
              <button
                key={time_.id}
                type="button"
                title={t(time_.labelKey)}
                aria-pressed={active}
                onClick={() => setTime(time_.id)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ease-squash',
                  active ? 'scale-110 bg-butter text-ink shadow-sm' : 'text-ink-soft hover:scale-105 hover:bg-white',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          title={soundOn ? t('nav.soundOff') : t('nav.soundOn')}
          aria-pressed={soundOn}
          onClick={() => {
            toggleSound();
            if (!soundOn) playChime();
          }}
          className={cn(
            'ml-1 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-squash',
            soundOn ? 'bg-seafoam text-ink' : 'text-ink-soft hover:bg-white',
          )}
        >
          {soundOn ? <Shell className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    </motion.header>
  );
}
