import React, { createContext, useContext } from 'react';

export interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  setIsDarkMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
