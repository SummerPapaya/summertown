import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mouse } from 'lucide-react';
import TownMap from '@/components/TownMap';
import type { OpenRequest } from '@/components/TownMap';
import Preloader from '@/components/Preloader';
import {
  FieldNotes,
  GoldenHour,
  BulletinBoard,
  Pledge,
} from '@/components/HomeSections';
import { byId } from '@/lib/landmarks';

const TITLE = 'Summer Town'.split('');

export default function Home() {
  const [searchParams] = useSearchParams();
  const placeParam = searchParams.get('place');
  const initialDeepLink = useMemo(
    () => (placeParam && byId(placeParam) ? placeParam : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [heroVisible, setHeroVisible] = useState(!initialDeepLink);
  const [tourSignal, setTourSignal] = useState(0);
  const [openRequest, setOpenRequest] = useState<OpenRequest | null>(
    initialDeepLink ? { id: initialDeepLink, key: 1 } : null,
  );

  /* react to ?place=<id> deep links, including in-place navigation */
  useEffect(() => {
    if (placeParam && byId(placeParam)) {
      setHeroVisible(false);
      setOpenRequest((r) =>
        r?.id === placeParam ? r : { id: placeParam, key: (r?.key ?? 0) + 1 },
      );
    }
  }, [placeParam]);

  const startExplore = () => setHeroVisible(false);

  const startTour = () => {
    setHeroVisible(false);
    setTourSignal((n) => n + 1);
  };

  const handleTourDone = (completed: boolean) => {
    if (completed) toast('Tour complete — now go poke everything.');
  };

  /** Field-notes click → scroll to top + open the landmark zoom (deep link style) */
  const requestOpen = (id: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHeroVisible(false);
    setOpenRequest((r) => ({ id, key: (r?.key ?? 0) + 1 }));
  };

  return (
    <div className="-mt-[88px]">
      {/* full-bleed map opts out of the Layout nav offset */}
      <Preloader />

      <section className="relative">
        <TownMap
          heroVisible={heroVisible}
          tourSignal={tourSignal}
          openRequest={openRequest}
          onTourDone={handleTourDone}
        />
        <HeroOverlay visible={heroVisible} onExplore={startExplore} onTour={startTour} />
      </section>

      <FieldNotes onOpen={requestOpen} />
      <GoldenHour />
      <BulletinBoard />
      <Pledge />
    </div>
  );
}

/* ================= Section 1 — Hero / Arrival overlay ================= */
function HeroOverlay({
  visible,
  onExplore,
  onTour,
}: {
  visible: boolean;
  onExplore: () => void;
  onTour: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-[3500] flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          {/* drifting clouds behind title */}
          <div
            className="ambient pointer-events-none absolute left-0 top-[16%] opacity-80"
            style={{ animation: 'st-cloud-drift 40s linear infinite' }}
            aria-hidden
          >
            <CloudSvg w={220} />
          </div>
          <div
            className="ambient pointer-events-none absolute left-0 top-[64%] opacity-60"
            style={{ animation: 'st-cloud-drift 65s linear infinite' }}
            aria-hidden
          >
            <CloudSvg w={160} />
          </div>

          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ delay: 0.9, duration: 0.7, ease: [0.22, 1.2, 0.36, 1] }}
            className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-coral"
          >
            A very small town by the sea
          </motion.p>

          {/* display title — character-level spring entrance */}
          <h1
            className="text-outline mt-3 flex flex-wrap justify-center font-display font-bold leading-[0.95] tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)' }}
            aria-label="Summer Town"
          >
            {TITLE.map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={{ y: 80, rotate: 8, scale: 0.6, opacity: 0 }}
                animate={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
                exit={{ y: -60, opacity: 0, transition: { duration: 0.35, delay: i * 0.03 } }}
                transition={{
                  delay: 1.05 + i * 0.04,
                  duration: 0.9,
                  ease: [0.34, 1.7, 0.64, 1],
                }}
                className="inline-block"
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0, transition: { duration: 0.35, delay: 0.05 } }}
            transition={{ delay: 1.55, duration: 0.7, ease: [0.22, 1.2, 0.36, 1] }}
            className="mt-5 max-w-xl px-6 text-center text-lg font-semibold text-ink-soft"
          >
            Thy eternal summer shall not fade.
          </motion.p>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0, transition: { duration: 0.35, delay: 0.1 } }}
            transition={{ delay: 1.7, duration: 0.7, ease: [0.22, 1.2, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <button type="button" onClick={onExplore} className="btn-primary text-base">
              Start exploring
            </button>
            <button type="button" onClick={onTour} className="btn-secondary text-base">
              Take the ferry tour
            </button>
          </motion.div>

          {/* scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 2.2, duration: 0.6 }}
            className="absolute bottom-8 flex flex-col items-center gap-2"
          >
            <motion.span
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-paper/80 text-ink shadow-sticker"
            >
              <Mouse className="h-4 w-4" />
            </motion.span>
            <span className="px-3 text-center font-hand text-xl text-ink-soft">
              scroll for the story, click the town to step inside
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CloudSvg({ w }: { w: number }) {
  return (
    <svg width={w} viewBox="0 0 200 70">
      <ellipse cx="70" cy="48" rx="52" ry="18" fill="#ffffff" />
      <ellipse cx="110" cy="36" rx="42" ry="20" fill="#ffffff" />
      <ellipse cx="140" cy="50" rx="36" ry="14" fill="#ffffff" />
    </svg>
  );
}
