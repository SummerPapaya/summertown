import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from '@/i18n/en';
import { zh } from '@/i18n/zh';

export type Language = 'en' | 'zh';

const LANG_KEY = 'st-lang';
const DICTS: Record<Language, unknown> = { en, zh };

/** Give up on the country lookup after this and fall back to Chinese. The
 *  lookup normally lands in a few tens of milliseconds; the ceiling only
 *  matters if the edge is slow or the endpoint is blocked. */
const GEO_TIMEOUT_MS = 900;

/** Countries that open in Chinese. Everything else opens in English. */
const ZH_COUNTRIES = new Set(['CN']);

declare global {
  interface Window {
    /** Started by the inline script in index.html; '' when unavailable. */
    __stGeo?: Promise<string>;
  }
}

/** dot-path lookup into a nested dictionary (arrays index by number) */
function lookup(dict: unknown, path: string): string | undefined {
  let cur: unknown = dict;
  for (const part of path.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

export interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
  /** dictionary lookup by dot path; falls back to English, then the raw key */
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageState | null>(null);

/** An explicit pick in the navbar — or null when this visitor has never
 *  chosen, in which case the opening language is theirs to be guessed. */
function readSavedLang(): Language | null {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return null;
}

/** Ask the edge which country the visitor is in. Null when we cannot tell. */
async function detectFromGeo(): Promise<Language | null> {
  const pending = window.__stGeo;
  if (!pending) return null;
  try {
    const country = await Promise.race([
      pending,
      new Promise<string>((resolve) => setTimeout(() => resolve(''), GEO_TIMEOUT_MS)),
    ]);
    if (!country) return null;
    return ZH_COUNTRIES.has(country.toUpperCase()) ? 'zh' : 'en';
  } catch {
    return null;
  }
}

/** The language to boot in: a saved pick wins, then the visitor's country,
 *  then Chinese. Awaited by main.tsx before the first render so the opening
 *  frame is already in the right language. */
export async function resolveInitialLang(): Promise<Language> {
  return readSavedLang() ?? (await detectFromGeo()) ?? 'zh';
}

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  /** Pre-resolved by main.tsx from the visitor's country. */
  initialLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(() => initialLang ?? readSavedLang() ?? 'zh');
  /* Only a deliberate pick is remembered. A geo guess is re-made on every
     visit, so the opening language keeps following the visitor around. */
  const explicit = useRef(readSavedLang() !== null);

  const setLang = useCallback((next: Language) => {
    explicit.current = true;
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    if (!explicit.current) return;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      let s = lookup(DICTS[lang], path) ?? lookup(DICTS.en, path) ?? path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

/**
 * Look up a dot path in the ENGLISH dictionary regardless of the active
 * language — used for the purple handwritten whisper captions, which always
 * render their English original in both languages.
 */
export function enText(path: string): string {
  return lookup(en, path) ?? path;
}
