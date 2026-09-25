import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

export type ThemeMode = 'dark' | 'light';
export type PalettePreset = 'control-room' | 'marine-sage' | 'thermal-mono';

interface ThemeContextValue {
  theme: ThemeMode;
  palette: PalettePreset;
  toggleTheme: () => void;
  setPalette: (p: PalettePreset) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LS_THEME = 'polaris-theme';
const LS_PALETTE = 'polaris-palette';

function getInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(LS_THEME);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable (SSR / private mode)
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getInitialPalette(): PalettePreset {
  try {
    const stored = localStorage.getItem(LS_PALETTE);
    if (
      stored === 'control-room' ||
      stored === 'marine-sage' ||
      stored === 'thermal-mono'
    )
      return stored;
  } catch {
    // ignore
  }
  return 'control-room';
}

function applyToHtml(theme: ThemeMode, palette: PalettePreset) {
  const html = document.documentElement;
  html.dataset.theme = theme;
  html.dataset.palette = palette;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [palette, setPaletteState] = useState<PalettePreset>(getInitialPalette);

  // Apply on mount and on every change
  useEffect(() => {
    applyToHtml(theme, palette);
    try {
      localStorage.setItem(LS_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme, palette]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setPalette = useCallback((p: PalettePreset) => {
    setPaletteState(p);
    try {
      localStorage.setItem(LS_PALETTE, p);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, palette, toggleTheme, setPalette }),
    [theme, palette, toggleTheme, setPalette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
