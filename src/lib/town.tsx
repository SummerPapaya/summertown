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
  const collectStamp = useCallback((id: string) => {
    let added = false;
    setStamps((prev) => {
      if (prev.includes(id)) return prev;
      added = true;
      return [...prev, id];
    });
    return added;
  }, []);

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
    }),
    [time, setTime, soundOn, toggleSound, stamps, hasStamp, collectStamp, mapDetailOpen],
  );

  return <TownContext.Provider value={value}>{children}</TownContext.Provider>;
}

export function useTown(): TownState {
  const ctx = useContext(TownContext);
  if (!ctx) throw new Error('useTown must be used inside <TownProvider>');
  return ctx;
}
