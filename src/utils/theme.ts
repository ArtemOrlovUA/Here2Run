import { useTheme } from '../context/ThemeContext';

export const getThemedStyles = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return {
    // Background colors
    backgroundColor: isDark ? 'bg-gray-900' : 'bg-gray-50',
    cardBackground: isDark ? 'bg-gray-800' : 'bg-white',

    // Text colors
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    textTertiary: isDark ? 'text-gray-400' : 'text-gray-500',

    // Border colors
    borderColor: isDark ? 'border-gray-700' : 'border-gray-200',

    // Other UI elements
    statusBarStyle: isDark ? 'light-content' : ('dark-content' as const),
    statusBarBgColor: isDark ? '#111827' : '#f9fafb',

    // Button styles (keeping blue accent)
    primaryButton: 'bg-blue-500', // Keep blue in both themes
    primaryButtonText: 'text-white',

    // Icon colors
    iconColor: isDark ? '#ffffff' : '#374151',
    iconColorSecondary: isDark ? '#d1d5db' : '#6b7280',
  };
};

export const getThemedColors = (theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';

  return {
    background: isDark ? '#111827' : '#f9fafb',
    cardBackground: isDark ? '#1f2937' : '#ffffff',
    textPrimary: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#d1d5db' : '#6b7280',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    tabBarBackground: isDark ? '#1f2937' : '#ffffff',
    tabBarBorder: isDark ? '#374151' : '#e5e7eb',
    primary: '#3b82f6', // Keep blue accent in both themes
  };
};
