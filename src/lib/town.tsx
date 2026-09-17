import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { LANDMARKS } from './landmarks';
import { setOcean } from './sound';

export type TimeOfDay = 'day' | 'golden' | 'starlight';

interface TownState {
  time: TimeOfDay;
  setTime: (t: TimeOfDay) => void;
  soundOn: boolean;
  toggleSound: () => void;
  stamps: string[];
  hasStamp: (id: string) => boolean;
  collectStamp: (id: string) => boolean; // returns true if newly collected
  /** true while a landmark detail card is open on the map (navbar tucks away) */
  mapDetailOpen: boolean;
  setMapDetailOpen: (open: boolean) => void;
  /** true while any other full-screen overlay is open, e.g. the album's photo
   *  sheet — the navbar is fixed above the page, so it has to get out of the
   *  way rather than sit on top of the overlay's own close button. */
  overlayOpen: boolean;
  setOverlayOpen: (open: boolean) => void;
}

const TownContext = createContext<TownState | null>(null);

const TIME_KEY = 'st-time';
const SOUND_KEY = 'st-sound';
const STAMPS_KEY = 'st-stamps';

function readTime(): TimeOfDay {
  try {
    const v = localStorage.getItem(TIME_KEY);
    if (v === 'golden' || v === 'starlight' || v === 'day') return v;
  } catch {
    /* ignore */
  }
  return 'day';
}

function readStamps(): string[] {
  try {
    const raw = localStorage.getItem(STAMPS_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.filter(
        (s): s is string =>
          typeof s === 'string' && LANDMARKS.some((l) => l.id === s),
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function TownProvider({ children }: { children: ReactNode }) {
  const [time, setTimeState] = useState<TimeOfDay>(readTime);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [stamps, setStamps] = useState<string[]>(readStamps);
  const [mapDetailOpen, setMapDetailOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.time = time;
    try {
      localStorage.setItem(TIME_KEY, time);
    } catch {
      /* ignore */
    }
  }, [time]);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [soundOn]);

  /* The shore is the site's background bed: off until they ask for it, then
     running under everything. Same switch as the chimes — one thing to turn
     off. It is a no-op while sound is off, so no AudioContext is created. */
  useEffect(() => {
    setOcean(soundOn);
  }, [soundOn]);

  useEffect(() => {
    try {
      localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps));
    } catch {
      /* ignore */
    }
  }, [stamps]);

  const setTime = useCallback((t: TimeOfDay) => setTimeState(t), []);
  const toggleSound = useCallback(() => setSoundOn((s) => !s), []);
  const hasStamp = useCallback((id: string) => stamps.includes(id), [stamps]);
  const collectStamp = useCallback(
    (id: string) => {
      /* Decide from the committed state, not inside the updater — a state
       * updater runs during the next render, so a flag assigned there is
       * still `false` when this function returns. It happened to work when
       * React eagerly evaluated the updater and silently dropped the stamp
       * whenever another update (e.g. the card's entrance animation) was
       * already pending, which the "collect" toast depended on. */
      if (stamps.includes(id)) return false;
      setStamps((prev) => (prev.includes(id) ? prev : [...prev, id]));
      return true;
    },
    [stamps],
  );

  const value = useMemo(
    () => ({
      time,
      setTime,
      soundOn,
      toggleSound,
      stamps,
      hasStamp,
      collectStamp,
      mapDetailOpen,
      setMapDetailOpen,
      overlayOpen,
      setOverlayOpen,
    }),
    [
      time,
      setTime,
      soundOn,
      toggleSound,
      stamps,
      hasStamp,
      collectStamp,
      mapDetailOpen,
      overlayOpen,
    ],
  );

  return <TownContext.Provider value={value}>{children}</TownContext.Provider>;
}

export function useTown(): TownState {
  const ctx = useContext(TownContext);
  if (!ctx) throw new Error('useTown must be used inside <TownProvider>');
  return ctx;
}
