import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native';
import { storageService } from '../services/storageService';

type ThemeType = 'light' | 'dark';
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  themePreference: 'light',
  setThemePreference: async () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>('light');
  const [theme, setTheme] = useState<ThemeType>('light');

  // Helper function to get current system color scheme
  const getCurrentSystemTheme = (): ThemeType => {
    const currentScheme = Appearance.getColorScheme();
    return (currentScheme === 'dark' ? 'dark' : 'light') as ThemeType;
  };

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedPreference = await storageService.getAppSetting('theme_preference');
        if (savedPreference && ['light', 'dark', 'system'].includes(savedPreference)) {
          setThemePreference(savedPreference as ThemePreference);
        } else {
          // Set default to light if no preference saved
          setThemePreference('light');
          await storageService.setAppSetting('theme_preference', 'light');
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
        // Fallback to light theme
        setThemePreference('light');
      }
    };

    loadTheme();
  }, []);

  // Apply theme based on preference
  useEffect(() => {
    if (themePreference === 'system') {
      // Always get the current system theme when switching to system mode
      const currentSystemTheme = getCurrentSystemTheme();
      setTheme(currentSystemTheme);
    } else {
      setTheme(themePreference as ThemeType);
    }
  }, [themePreference]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (themePreference === 'system') {
      const listener = Appearance.addChangeListener((preferences) => {
        const newTheme = (preferences.colorScheme === 'dark' ? 'dark' : 'light') as ThemeType;
        setTheme(newTheme);
      });

      return () => {
        listener.remove();
      };
    }
  }, [themePreference]);

  const updateThemePreference = async (preference: ThemePreference) => {
    try {
      setThemePreference(preference);

      // If switching to system, immediately apply the current system theme
      if (preference === 'system') {
        const currentSystemTheme = getCurrentSystemTheme();
        setTheme(currentSystemTheme);
      }

      await storageService.setAppSetting('theme_preference', preference);
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themePreference,
        setThemePreference: updateThemePreference,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};
