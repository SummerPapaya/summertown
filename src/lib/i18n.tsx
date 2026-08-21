import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from '@/i18n/en';
import { zh } from '@/i18n/zh';

export type Language = 'en' | 'zh';

const LANG_KEY = 'st-lang';
const DICTS: Record<Language, unknown> = { en, zh };

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

function readLang(): Language {
  try {
    if (localStorage.getItem(LANG_KEY) === 'zh') return 'zh';
  } catch {
    /* ignore */
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readLang);

  const setLang = useCallback((next: Language) => setLangState(next), []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
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
