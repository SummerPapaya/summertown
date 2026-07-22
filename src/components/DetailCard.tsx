import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  X,
  Clock,
  Flower2,
  Sparkles,
  Drama,
  Waves,
  Ticket,
  Guitar,
  Flame,
  CupSoda,
  Cat,
  Apple,
  KeyRound,
  Image,
  Palette,
  Trophy,
  Coffee,
  Croissant,
  BookOpen,
  Mic,
  Radio,
  Sunset,
  Shell,
  Moon,
  Pencil,
  Sailboat,
  Medal,
  Leaf,
  Wand2,
  Bell,
  Star,
  Luggage,
  Home,
  Citrus,
  CakeSlice,
  RadioTower,
  Podcast,
  Stamp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Landmark } from '@/lib/landmarks';
import { useTown } from '@/lib/town';

const FACT_ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  flower: Flower2,
  sparkles: Sparkles,
  theater: Drama,
  waves: Waves,
  ticket: Ticket,
  guitar: Guitar,
  flame: Flame,
  cup: CupSoda,
  cat: Cat,
  apple: Apple,
  key: KeyRound,
  image: Image,
  palette: Palette,
  trophy: Trophy,
  coffee: Coffee,
  croissant: Croissant,
  book: BookOpen,
  mic: Mic,
  radio: Radio,
  sunset: Sunset,
  shell: Shell,
  moon: Moon,
  pencil: Pencil,
  sailboat: Sailboat,
  medal: Medal,
  leaf: Leaf,
  wand: Wand2,
  bell: Bell,
  star: Star,
  luggage: Luggage,
  home: Home,
  lemon: Citrus,
  pie: CakeSlice,
  lighthouse: RadioTower,
};

interface DetailCardProps {
  landmark: Landmark;
  onClose: () => void;
  onNext: () => void;
}

export default function DetailCard({ landmark: lm, onClose, onNext }: DetailCardProps) {
  const { stamps, collectStamp } = useTown();
  const [justStamped, setJustStamped] = useState(false);
  const stamped = stamps.includes(lm.id);

  /* lock page scroll while the card is open — the overlay scrolls natively
     (data-lenis-prevent keeps Lenis from hijacking its wheel events) */
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  const collect = () => {
    if (stamped) return;
    const added = collectStamp(lm.id);
    if (added) {
      setJustStamped(true);
      toast(`Stamped! ${stamps.length + 1} of 14.`, {
        description: `${lm.name} is now in your passport.`,
      });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[4000]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${lm.name} details`}
    >
      {/* cream veil — click to close */}
      <button
        type="button"
        aria-label="Back to map"
        onClick={onClose}
        className="fixed inset-0 bg-cream/25 backdrop-blur-[1px]"
      />

      {/* scroll container — card scrolls when taller than the viewport */}
      <div className="absolute inset-0 overflow-y-auto overscroll-contain" onClick={onClose} data-lenis-prevent>
        <div className="flex min-h-full items-end justify-center md:items-center">
      <motion.div
        initial={{ rotateY: 88, opacity: 0, y: 40 }}
        animate={{ rotateY: 0, opacity: 1, y: 0 }}
        exit={{ rotateY: -70, opacity: 0, y: 20, transition: { duration: 0.35, ease: 'easeIn' } }}
        transition={{
          duration: 0.55,
          delay: 1.0,
          ease: [0.34, 1.4, 0.64, 1] as [number, number, number, number],
        }}
        style={{ transformPerspective: 1200 }}
        onClick={(e) => e.stopPropagation()}
        className="sticker-card relative m-2 flex w-full max-w-[1080px] flex-col overflow-hidden md:m-6"
      >
        {/* close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-paper text-ink shadow-sticker transition-transform duration-300 ease-squash hover:rotate-90 hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        {/* top: scene illustration — full view, uncropped */}
        <div className="relative p-4 pb-0">
          <div className="relative">
            <motion.img
              key={lm.scene}
              src={lm.scene}
              alt={`${lm.name} scene`}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="aspect-[3/2] w-full rounded-[20px] object-cover"
              onError={(e) => {
                const t = e.currentTarget;
                if (!t.src.endsWith(lm.img)) t.src = lm.img;
              }}
            />
            {/* taped corner caption */}
            <div
              className="absolute left-4 top-4 bg-butter/80 px-3 py-1 shadow-sm"
              style={{ transform: 'rotate(-4deg)' }}
            >
              <span className="font-hand text-lg text-ink">{lm.whisper}</span>
            </div>
            {/* permanent mini-stamp when collected */}
            {stamped && <MiniStamp />}
          </div>
        </div>

        {/* right: content */}
        <div className="relative p-6 md:p-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06, delayChildren: 1.1 } },
            }}
          >
            <motion.div variants={item}>
              <span
                className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/60 px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: lm.accent }} />
                {lm.chip}
              </span>
            </motion.div>

            <motion.h2
              variants={item}
              className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.01em] text-ink"
            >
              {lm.name}
            </motion.h2>

            <motion.p variants={item} className="mt-1 font-hand text-[clamp(1.4rem,2vw,1.75rem)] text-ink-soft">
              {lm.tagline}
            </motion.p>

            <motion.p variants={item} className="mt-4 text-[1.02rem] font-semibold leading-[1.65] text-ink/90">
              {lm.lore}
            </motion.p>

            <motion.div variants={item} className="mt-5">
              <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
                Three small things
              </h3>
              <ul className="mt-2 space-y-2">
                {lm.facts.map((f, i) => {
                  const Icon = FACT_ICONS[f.icon] ?? Sparkles;
                  return (
                    <motion.li
                      key={i}
                      initial={{ x: -16, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.25 + i * 0.08, duration: 0.4, ease: [0.22, 1.2, 0.36, 1] }}
                      className="flex items-center gap-3 text-sm font-bold text-ink"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white"
                        style={{ background: `${lm.accent}55` }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {f.text}
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>

            {/* embedded podcast (Summer FM / Windbell Isle) */}
            {(lm.id === 'radio' || lm.id === 'windbell-isle') && (
              <motion.div variants={item} className="mt-5">
                <div className="overflow-hidden rounded-[20px] border-[3px] border-white bg-white/60 shadow-sticker">
                  <div className="flex items-center gap-2 border-b-2 border-dashed border-ink/10 px-4 py-2.5">
                    <Podcast className="h-4 w-4 text-coral" />
                    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-soft">
                      {lm.id === 'radio' ? 'Summer FM podcast' : 'Windbell Isle podcast'}
                    </span>
                    <a
                      href={lm.id === 'radio' ? 'https://www.xiaoyuzhoufm.com/podcast/6553548956431ed02df2c1c4' : 'https://www.xiaoyuzhoufm.com/podcast/697b5920ea396c6d6ffa2bc9'}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[0.7rem] font-bold text-ink-soft underline decoration-dotted underline-offset-2 transition-colors hover:text-ink"
                    >
                      {lm.id === 'radio' ? 'xiaoyuzhoufm.com ↗' : 'xiaoyuzhoufm.com ↗'}
                    </a>
                  </div>
                  <iframe
                    src={lm.id === 'radio' ? 'https://www.xiaoyuzhoufm.com/podcast/6553548956431ed02df2c1c4' : 'https://www.xiaoyuzhoufm.com/podcast/697b5920ea396c6d6ffa2bc9'}
                    title={lm.id === 'radio' ? 'Summer FM podcast' : 'Windbell Isle podcast'}
                    className="block h-[300px] w-full"
                    loading="lazy"
                    allow="autoplay; clipboard-write"
                  />
                </div>
              </motion.div>
            )}

            {/* footer row */}
            <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={collect}
                disabled={stamped}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-90"
                style={stamped ? { background: 'var(--leaf)' } : undefined}
              >
                <Stamp className="h-4 w-4" />
                {stamped ? 'Stamped!' : 'Collect stamp'}
              </button>
              <button type="button" onClick={onNext} className="btn-secondary px-5 py-2.5 text-sm">
                Next landmark →
              </button>
              <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">
                Back to map
              </button>
              {lm.id === 'windbell-isle' && (
                <Link to="/windbell-isle" className="btn-primary px-5 py-2.5 text-sm" style={{ background: 'var(--butter)', color: 'var(--ink)' }}>
                  Cross the pier →
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* stamp slam overlay */}
        {justStamped && (
          <motion.div
            initial={{ scale: 2, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: -12, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            onAnimationComplete={() => setJustStamped(false)}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <Postmark />
          </motion.div>
        )}
      </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

const item = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1.2, 0.36, 1] as [number, number, number, number] } },
};

function MiniStamp() {
  return (
    <div className="absolute bottom-6 right-6 rotate-[-12deg]">
      <Postmark small />
    </div>
  );
}

function Postmark({ small }: { small?: boolean }) {
  const size = small ? 72 : 140;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--coral)" strokeWidth="3" strokeDasharray="5 4" opacity="0.9" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="var(--coral)" strokeWidth="2" opacity="0.9" />
      <text x="50" y="40" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="var(--coral)" fontFamily="Nunito, sans-serif" letterSpacing="1">
        SUMMER TOWN
      </text>
      <text x="50" y="56" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--coral)" fontFamily="Fredoka, sans-serif">
        STAMPED
      </text>
      <text x="50" y="70" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--coral)" fontFamily="Nunito, sans-serif" letterSpacing="1">
        EST. 1962
      </text>
    </svg>
  );
}
