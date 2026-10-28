'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { sceneFor, isSpaceEligiblePath } from '../utils/spaceScenes';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('appDarkMode') === 'true'
  );

  // Theme (Default | Space). Remembered on this device only.
  const pathname = usePathname();
  const [theme, setThemeState] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('sf_theme') === 'space' ? 'space' : 'default'
  );
  const spaceActive = theme === 'space' && isSpaceEligiblePath(pathname);
  // The Space theme is a dark theme: it switches on the same dark styling every page already has.
  // The light/dark switch keeps working exactly as before underneath.
  const effectiveDark = isDarkMode || spaceActive;

  const setTheme = (next) => {
    const value = next === 'space' ? 'space' : 'default';
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
    } else {
      el.removeAttribute('data-theme');
      el.removeAttribute('data-space-scene');
    }
  }, [spaceActive, pathname]);

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
