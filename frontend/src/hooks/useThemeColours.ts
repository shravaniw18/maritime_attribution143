import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export interface ThemeColours {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  safe: string;
  warn: string;
  critical: string;
  oil: string;
  accent: string;
  mapBg: string;
}

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useThemeColours(): ThemeColours {
  // Re-read whenever theme or palette changes
  const { theme, palette } = useTheme();

  return useMemo<ThemeColours>(
    () => ({
      bg:          readVar('--c-bg'),
      surface:     readVar('--c-surface'),
      surfaceAlt:  readVar('--c-surface-alt'),
      border:      readVar('--c-border'),
      textPrimary: readVar('--c-text-primary'),
      textMuted:   readVar('--c-text-muted'),
      safe:        readVar('--c-safe'),
      warn:        readVar('--c-warn'),
      critical:    readVar('--c-critical'),
      oil:         readVar('--c-oil'),
      accent:      readVar('--c-accent'),
      mapBg:       readVar('--c-map-bg'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, palette]
  );
}
