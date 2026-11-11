import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Dark is the default. The choice is kept in localStorage and applied as <html data-theme="light">.
// index.html applies a saved choice before React loads, so a light-theme page never flashes dark.
const STORAGE_KEY = 'spms_theme';
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

const readTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;
  }, [theme]);

  // Saved only when the user actually switches, so loading a page never overwrites their choice
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // private mode or blocked storage: the theme still applies for this visit
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
