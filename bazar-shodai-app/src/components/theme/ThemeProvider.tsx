import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useThemeStore, ThemePreference } from '@/store/useThemeStore';
import { LightColors, DarkColors, ThemeColors } from '@/constants/colors';
import { useSiteSettings } from '@/services/siteService';

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  themeMode: ThemePreference;
  showThemeToggle: boolean;
  setThemeMode: (mode: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useDeviceColorScheme();
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  const { themeMode, setThemeMode, toggleTheme } = useThemeStore();
  const { data: siteSettings } = useSiteSettings();

  const showThemeToggle = Boolean(siteSettings?.site?.showThemeToggle);

  const isDark = useMemo(() => {
    // If admin has disabled theme toggle on the store, adhere strictly to light theme
    if (!showThemeToggle) {
      return false;
    }
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme, showThemeToggle]);

  useEffect(() => {
    const targetScheme = isDark ? 'dark' : 'light';
    if (colorScheme !== targetScheme) {
      setColorScheme(targetScheme);
    }
  }, [isDark, colorScheme, setColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colors: isDark ? DarkColors : LightColors,
      themeMode,
      showThemeToggle,
      setThemeMode,
      toggleTheme,
    }),
    [isDark, themeMode, showThemeToggle, setThemeMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
