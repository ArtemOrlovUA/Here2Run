import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

interface StreakCardProps {
  streak: number;
  isAtRisk?: boolean;
  needsThisWeekRun?: boolean;
}

export default function StreakCard({
  streak,
  isAtRisk = false,
  needsThisWeekRun = true,
}: StreakCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();
  const isZeroStreak = streak === 0;
  const weeksText = streak === 1 ? 'week' : 'weeks';

  // Determine card appearance based on streak state and theme
  const cardBgClass = isAtRisk
    ? theme === 'dark'
      ? 'bg-gray-700'
      : 'bg-gray-100'
    : styles.cardBackground;
  const cardBorderClass = isAtRisk
    ? theme === 'dark'
      ? 'border-gray-600'
      : 'border-gray-300'
    : styles.borderColor;

  // Determine streak number and icon colors
  const streakNumberColor = isAtRisk
    ? theme === 'dark'
      ? 'text-gray-400'
      : 'text-gray-600'
    : isZeroStreak
    ? theme === 'dark'
      ? 'text-gray-500'
      : 'text-gray-400'
    : 'text-orange-500';
  const fireIconColor = isAtRisk
    ? theme === 'dark'
      ? '#9ca3af'
      : '#6b7280'
    : isZeroStreak
    ? theme === 'dark'
      ? '#6b7280'
      : '#9ca3af'
    : '#f97316';
  const fireIconName = isAtRisk ? 'flame-outline' : 'flame';

  // Determine message text
  let streakText = '';
  let textColor = styles.textSecondary;

  if (isAtRisk) {
    streakText = 'Your streak is on the line!';
    textColor = 'text-red-500';
  } else if (isZeroStreak) {
    streakText = "Don't wait. Journey awaits!";
    textColor = styles.textSecondary;
  } else if (needsThisWeekRun && streak > 0) {
    streakText = 'Run this week to keep your streak!';
    textColor = 'text-blue-500';
  } else {
    streakText = 'Keep pushing!';
    textColor = styles.textSecondary;
  }

  return (
    <View className="flex-row gap-x-4 mb-6">
      {/* Left section - Current streak */}
      <View className={`flex-1 ${cardBgClass} rounded-xl p-6 shadow-sm border ${cardBorderClass}`}>
        <Text
          className={`text-lg font-semibold mb-4 ${
            isAtRisk ? (theme === 'dark' ? 'text-gray-400' : 'text-gray-600') : styles.textPrimary
          }`}>
          Your weekly streak
        </Text>

        <View className="flex-row items-center mb-2">
          <Text className={`text-5xl font-bold ${streakNumberColor}`}>{streak}</Text>
          <Text
            className={`text-xl ml-2 ${
              isAtRisk
                ? theme === 'dark'
                  ? 'text-gray-500'
                  : 'text-gray-500'
                : styles.textSecondary
            }`}>
            {weeksText}
          </Text>
          <Ionicons name={fireIconName} size={40} color={fireIconColor} style={{ marginLeft: 8 }} />
        </View>

        <Text className={`text-base font-bold ${textColor}`}>{streakText}</Text>
      </View>

      {/* Right section - Current goal */}
      <View
        className={`flex-1 ${cardBgClass} rounded-xl p-6 shadow-sm border ${cardBorderClass} flex-col justify-center items-center`}>
        <Text
          className={`text-lg font-semibold mb-2 text-center ${
            isAtRisk ? (theme === 'dark' ? 'text-gray-400' : 'text-gray-600') : styles.textPrimary
          }`}>
          Current goal
        </Text>
        <Text
          className={`text-base text-center ${
            isAtRisk ? (theme === 'dark' ? 'text-gray-500' : 'text-gray-500') : styles.textSecondary
          }`}>
          run every <Text className="font-bold">week</Text>
        </Text>
      </View>
    </View>
  );
}
