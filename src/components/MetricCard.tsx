import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

export default function MetricCard({
  title,
  value,
  unit,
  icon,
  variant = 'primary',
}: MetricCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-slate-100 border-slate-200';
      case 'accent':
        return theme === 'dark' ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200';
      default:
        return `${styles.cardBackground} ${styles.borderColor}`;
    }
  };

  return (
    <View className={`rounded-xl p-4 border ${getVariantStyles()} shadow-sm`}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`text-sm font-medium ${styles.textSecondary} uppercase tracking-wide`}>
          {title}
        </Text>
        {icon && <View className="w-6 h-6">{icon}</View>}
      </View>

      <View className="flex-row items-baseline">
        <Text className={`text-2xl font-bold ${styles.textPrimary}`}>{value}</Text>
        {unit && <Text className={`ml-1 text-sm font-medium ${styles.textSecondary}`}>{unit}</Text>}
      </View>
    </View>
  );
}
