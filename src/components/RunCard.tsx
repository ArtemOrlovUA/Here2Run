import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RunSummary } from '../types/run';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

interface RunCardProps {
  run: RunSummary;
  onPress: () => void;
}

export default function RunCard({ run, onPress }: RunCardProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const getDisplayName = (): string => {
    return run.name || `${formatDistance(run.distance)} Run`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculatePace = (meters: number, seconds: number): string => {
    if (meters === 0) return '0:00';
    const minutesPerKm = seconds / 60 / (meters / 1000);
    const minutes = Math.floor(minutesPerKm);
    const secondsRemainder = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes}:${secondsRemainder.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${styles.cardBackground} rounded-xl p-4 mb-3 shadow-sm border ${styles.borderColor}`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View
            className={`w-10 h-10 ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
            } rounded-full items-center justify-center mr-3`}>
            <Ionicons name="footsteps" size={20} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className={`text-lg font-semibold ${styles.textPrimary}`} numberOfLines={1}>
              {truncateText(getDisplayName(), 35)}
            </Text>
            <Text className={`text-sm ${styles.textSecondary}`}>{formatDate(run.date)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={styles.iconColorSecondary} />
      </View>

      <View className="flex-row justify-between">
        <View className="flex-1 mr-2">
          <Text
            className={`text-xs font-medium ${styles.textSecondary} uppercase tracking-wide mb-1`}>
            Distance
          </Text>
          <Text className={`text-base font-semibold ${styles.textPrimary}`}>
            {formatDistance(run.distance)}
          </Text>
        </View>
        <View className="flex-1 mr-2">
          <Text
            className={`text-xs font-medium ${styles.textSecondary} uppercase tracking-wide mb-1`}>
            Duration
          </Text>
          <Text className={`text-base font-semibold ${styles.textPrimary}`}>
            {formatDuration(run.duration)}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className={`text-xs font-medium ${styles.textSecondary} uppercase tracking-wide mb-1`}>
            Pace
          </Text>
          <Text className={`text-base font-semibold ${styles.textPrimary}`}>
            {calculatePace(run.distance, run.duration)} /km
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
