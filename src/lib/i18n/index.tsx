import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  formatWebMessage,
  normalizeWebLocale,
  SUPPORTED_WEB_LOCALES,
  type WebLocale,
  type WebMessageKey,
} from "./messages";

const STORAGE_KEY = "revv_web_locale";

interface I18nContextValue {
  locale: WebLocale;
  setLocale: (next: WebLocale) => void;
  t: (key: WebMessageKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key, params) => formatWebMessage("en", key, params),
});

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: WebLocale;
}) {
  const [locale, setLocaleState] = useState<WebLocale>(initialLocale ?? "en");

  useEffect(() => {
    if (typeof window === "undefined" || initialLocale) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLocaleState(normalizeWebLocale(stored));
      return;
    }
    const navLang = window.navigator.language;
    if (navLang) {
      setLocaleState(normalizeWebLocale(navLang));
    }
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: WebLocale) => {
    const normalized = normalizeWebLocale(next);
    setLocaleState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  }, []);

  const t = useCallback(
    (key: WebMessageKey, params?: Record<string, string | number>) =>
      formatWebMessage(locale, key, params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export { SUPPORTED_WEB_LOCALES, formatWebMessage, normalizeWebLocale };
export type { WebLocale, WebMessageKey };
