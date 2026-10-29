'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { sceneFor, isSpaceEligiblePath, natureSceneFor, normalizeTheme, NATURE_THEMES, DARK_NATURE_THEMES } from '../utils/spaceScenes';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('appDarkMode') === 'true'
  );

  // Theme (Default | Space | Desert | Rainforest | Island beach). Remembered on this device only.
  const pathname = usePathname();
  const [theme, setThemeState] = useState(() =>
    typeof window !== 'undefined' ? normalizeTheme(localStorage.getItem('sf_theme')) : 'default'
  );
  const themeActive = theme !== 'default' && isSpaceEligiblePath(pathname);
  const spaceActive = themeActive && theme === 'space';
  const natureActive = themeActive && NATURE_THEMES.indexOf(theme) >= 0;
  // Space, Desert and Rainforest are dark themes: they switch on the same dark styling every page already
  // has. Island beach is the light theme, so it always uses the normal light styling.
  // The light/dark switch keeps working exactly as before underneath.
  const darkTheme = spaceActive || (natureActive && DARK_NATURE_THEMES.indexOf(theme) >= 0);
  const effectiveDark = themeActive && theme === 'beach' ? false : isDarkMode || darkTheme;

  const setTheme = (next) => {
    const value = normalizeTheme(next);
    try { localStorage.setItem('sf_theme', value); } catch {}
    setThemeState(value);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('appDarkMode', String(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('app-dark-scrollbar', effectiveDark);
  }, [effectiveDark]);

  useEffect(() => {
    const el = document.documentElement;
    if (spaceActive) {
      el.setAttribute('data-theme', 'space');
      el.setAttribute('data-space-scene', sceneFor(pathname));
      el.removeAttribute('data-nature-scene');
    } else if (natureActive) {
      el.setAttribute('data-theme', theme);
      el.setAttribute('data-nature-scene', natureSceneFor(pathname));
      el.removeAttribute('data-space-scene');
    } else {
      el.removeAttribute('data-theme');
      el.removeAttribute('data-space-scene');
      el.removeAttribute('data-nature-scene');
    }
  }, [spaceActive, natureActive, theme, pathname]);

  return (
    <UIContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar, isDarkMode: effectiveDark, toggleDarkMode, theme, setTheme }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
