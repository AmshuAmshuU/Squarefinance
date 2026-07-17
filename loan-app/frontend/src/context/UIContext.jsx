'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('appDarkMode') === 'true'
  );

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
    document.documentElement.classList.toggle('app-dark-scrollbar', isDarkMode);
  }, [isDarkMode]);

  return (
    <UIContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar, isDarkMode, toggleDarkMode }}>
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
