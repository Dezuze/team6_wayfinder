import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('campusbus-theme-mode') || 'auto';
  });

  const [systemDark, setSystemDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('campusbus-theme-mode', themeMode);
    
    if (themeMode === 'auto') {
      root.setAttribute('data-theme', 'auto');
    } else {
      root.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  const cycleTheme = () => {
    if (themeMode === 'auto') setThemeMode('light');
    else if (themeMode === 'light') setThemeMode('dark');
    else setThemeMode('auto');
  };

  const effectiveTheme = themeMode === 'auto' ? (systemDark ? 'dark' : 'light') : themeMode;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, cycleTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
