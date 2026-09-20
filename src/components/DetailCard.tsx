import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, type Variants } from 'framer-motion';
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
  CalendarDays,
  Pin,
  Stamp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TOTAL_STAMPS, type Landmark } from '@/lib/landmarks';
import { useTown } from '@/lib/town';
import { useLanguage, enText } from '@/lib/i18n';

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

/**
 * Link rows that reveal a preview of where they lead — real screenshots of
 * the destination, cross-fading while the pointer rests anywhere on the row.
 * Shared by the Apple Cottage album link and the Starlight Library link.
 */
interface PreviewItem {
  src: string;
  labelKey: string;
}

const ALBUM_PREVIEWS: PreviewItem[] = [
  { src: '/preview-apple-album-calendar.jpg', labelKey: 'apple.calendar' },
  { src: '/preview-apple-album-gallery.jpg', labelKey: 'apple.gallery' },
];

const LIBRARY_PREVIEWS: PreviewItem[] = [
  { src: '/preview-library-home.jpg', labelKey: 'detail.libraryHome' },
  { src: '/preview-library-starlight.jpg', labelKey: 'detail.libraryStarlight' },
];

const PREVIEW_LINK_CLASS =
  'group flex items-center gap-2.5 rounded-[20px] border-[3px] border-white bg-white/60 px-4 py-3 shadow-sticker transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:bg-white/80';

function HoverPreviewRow({
  variants,
  href,
  external,
  Icon,
  labelKey,
  previews,
}: {
  variants: Variants;
  href: string;
  external?: boolean;
  Icon: LucideIcon;
  labelKey: string;
  previews: PreviewItem[];
}) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    const id = window.setInterval(
      () => setActive((v) => (v + 1) % previews.length),
      2600,
    );
    return () => window.clearInterval(id);
  }, [hovered, previews.length]);

  const leave = () => {
    setHovered(false);
    setActive(0);
  };

  const inner = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-coral/30">
        <Icon className="h-4 w-4 text-coral" />
      </span>
      <span className="font-display text-sm font-semibold text-ink transition-transform duration-300 ease-squash group-hover:scale-[1.02]">
        {t(labelKey)}
      </span>
    </>
  );

  return (
    <motion.div
      variants={variants}
      className="group/preview mt-5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={leave}
    >
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={PREVIEW_LINK_CLASS}>
          {inner}
        </a>
      ) : (
        <Link to={href} className={PREVIEW_LINK_CLASS}>
          {inner}
        </Link>
      )}

      {/* hover preview — real screenshots, expands on desktop hover */}
      <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 ease-squash group-hover/preview:max-h-[420px] group-hover/preview:pt-3 group-hover/preview:opacity-100">
        <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-[16px] border-[3px] border-white bg-cream shadow-sticker">
          {previews.map((p, i) => (
            <img
              key={p.src}
              src={p.src}
              alt={t(labelKey)}
              className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
              loading="eager"
            />
          ))}
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-white/85 px-3 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-ink-soft shadow-sticker backdrop-blur-sm">
            {t(previews[active].labelKey)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function DetailCard({ landmark: lm, onClose, onNext }: DetailCardProps) {
  const { stamps, collectStamp } = useTown();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const name = t(lm.nameKey);
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
    if (!collectStamp(lm.id)) return;
    setJustStamped(true);
    const n = stamps.length + 1;

    /* Last one — the passport is complete. Offer the generator rather than
       yanking them there mid-stamp: the toast sits there until they take it,
       and the button on it is what does the navigating. The card stays open so
       the freshly stamped state is what they come back to if they dismiss it. */
    if (n >= TOTAL_STAMPS) {
      toast(t('detail.stampComplete', { total: TOTAL_STAMPS }), {
        description: t('detail.stampCompleteDesc'),
        duration: 12000,
        action: {
          label: t('detail.stampCompleteAction'),
          onClick: () => {
            void navigate('/journal#passport', { state: { makePassport: true } });
          },
        },
      });
      return;
    }

    toast(t('detail.stampToast', { n, total: TOTAL_STAMPS }), {
      description: t('detail.stampToastDesc', { name }),
    });
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
      aria-label={t('detail.detailsAria', { name })}
    >
      {/* cream veil — click to close */}
      <button
        type="button"
        aria-label={t('detail.backToMap')}
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
          aria-label={t('detail.closeDetails')}
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
              alt={t('detail.sceneAlt', { name })}
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
              <span lang="en" className="font-hand text-lg text-ink">
                {enText(lm.whisperKey)}
              </span>
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
                {t(lm.chipKey)}
              </span>
            </motion.div>

            <motion.h2
              variants={item}
              className="mt-3 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.01em] text-ink"
            >
              {name}
            </motion.h2>

            <motion.p variants={item} className="mt-1 font-hand text-[clamp(1.4rem,2vw,1.75rem)] text-ink-soft">
              {t(lm.taglineKey)}
            </motion.p>

            <motion.p variants={item} className="mt-4 text-[1.02rem] font-semibold leading-[1.65] text-ink/90">
              {t(lm.loreKey)}
            </motion.p>

            <motion.div variants={item} className="mt-5">
              <h3 className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
                {t('detail.threeThings')}
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
                      {t(f.textKey)}
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
                      {t(lm.id === 'radio' ? 'detail.podcastRadio' : 'detail.podcastIsle')}
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
                    title={t(lm.id === 'radio' ? 'detail.podcastRadio' : 'detail.podcastIsle')}
                    className="block h-[300px] w-full"
                    loading="lazy"
                    allow="autoplay; clipboard-write"
                  />
                </div>
              </motion.div>
            )}

            {/* Town Hall — calendar + postcard wall live on the journal */}
            {lm.id === 'town-hall' && (
              <motion.div variants={item} className="mt-5 flex flex-col gap-2.5">
                <Link
                  to="/journal#town-calendar"
                  className="group flex items-center gap-2.5 rounded-[20px] border-[3px] border-white bg-white/60 px-4 py-3 shadow-sticker transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:bg-white/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-coral/30">
                    <CalendarDays className="h-4 w-4 text-coral" />
                  </span>
                  <span className="font-display text-sm font-semibold text-ink transition-transform duration-300 ease-squash group-hover:scale-[1.02]">
                    {t('detail.townCalendar')}
                  </span>
                </Link>
                <Link
                  to="/journal#postcard-wall"
                  className="group flex items-center gap-2.5 rounded-[20px] border-[3px] border-white bg-white/60 px-4 py-3 shadow-sticker transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:bg-white/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-coral/30">
                    <Pin className="h-4 w-4 text-coral" />
                  </span>
                  <span className="font-display text-sm font-semibold text-ink transition-transform duration-300 ease-squash group-hover:scale-[1.02]">
                    {t('detail.postcardWall')}
                  </span>
                </Link>
              </motion.div>
            )}
            {/* Starlight Library link (Tides' End Library) */}
            {lm.id === 'library' && (
              <HoverPreviewRow
                variants={item}
                href="https://shufang-galaxy.summercommences.com/"
                external
                Icon={Star}
                labelKey="detail.starlightLibrary"
                previews={LIBRARY_PREVIEWS}
              />
            )}

            {/* An Apple A Day album link (Apple Cottage) */}
            {lm.id === 'apple-cottage' && (
              <HoverPreviewRow
                variants={item}
                href="/apple-album"
                Icon={Apple}
                labelKey="detail.appleAlbum"
                previews={ALBUM_PREVIEWS}
              />
            )}

            {/* Magic Room — the witch's own Three.js reading room, a static
                sub-app at /magic-room/. A plain <a>, not <Link>: React Router
                has no route there, so client-side navigation would land on
                the SPA fallback instead of the room. */}
            {lm.id === 'magic-house' && (
              <motion.div variants={item} className="mt-5">
                <a
                  href={`/magic-room?lang=${lang}`}
                  className="group flex items-center gap-2.5 rounded-[20px] border-[3px] border-white bg-white/60 px-4 py-3 shadow-sticker transition-all duration-300 ease-squash hover:-translate-y-0.5 hover:bg-white/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-coral/30">
                    <Wand2 className="h-4 w-4 text-coral" />
                  </span>
                  <span className="font-display text-sm font-semibold text-ink transition-transform duration-300 ease-squash group-hover:scale-[1.02]">
                    {t('detail.magicRoom')}
                  </span>
                </a>
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
                {stamped ? t('detail.stamped') : t('detail.collectStamp')}
              </button>
              <button type="button" onClick={onNext} className="btn-secondary px-5 py-2.5 text-sm">
                {t('detail.next')}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">
                {t('detail.backToMap')}
              </button>
              {lm.id === 'windbell-isle' && (
                <Link to="/windbell-isle" className="btn-primary px-5 py-2.5 text-sm" style={{ background: 'var(--butter)', color: 'var(--ink)' }}>
                  {t('detail.crossPier')}
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

const item: Variants = {
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
        EST. 1862
      </text>
    </svg>
  );
}
