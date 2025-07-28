import React from 'react';
import { View, Text } from 'react-native';
import { GPSStatus } from '../types/gps';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

interface TrackingHeaderProps {
  isTracking: boolean;
  isPaused: boolean;
  gpsStatus: GPSStatus;
  isLocationLoading: boolean;
  showRecoveryMessage: boolean;
  showGpsDisabledMessage: boolean;
}

export default function TrackingHeader({
  isTracking,
  isPaused,
  gpsStatus,
  isLocationLoading,
  showRecoveryMessage,
  showGpsDisabledMessage,
}: TrackingHeaderProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();

  const getStatusMessage = (): string => {
    // Recovery message
    if (showRecoveryMessage) {
      return 'Previous run recovered and paused';
    }

    // GPS disabled during tracking
    if (showGpsDisabledMessage) {
      if (isTracking && isPaused) {
        return 'GPS connection lost - run paused';
      } else if (isTracking) {
        return 'GPS connection lost - tracking interrupted';
      } else {
        return 'GPS connection lost - tracking unavailable';
      }
    }

    // GPS-related status messages
    if (!gpsStatus.servicesEnabled) {
      return 'GPS is not accessible - enable location services';
    }
    if (gpsStatus.permission !== 'granted') {
      return 'GPS is not accessible - location permission required';
    }
    if (isLocationLoading) {
      return 'Getting your location...';
    }

    // Tracking status messages
    if (!isTracking) return 'Ready to start your run';
    if (isPaused) return 'Run paused';
    return 'Tracking your run...';
  };

  const getStatusColor = (): string => {
    // Recovery message
    if (showRecoveryMessage) {
      return 'text-green-600';
    }

    // GPS disabled during tracking
    if (showGpsDisabledMessage) {
      return 'text-red-600';
    }

    // GPS-related status colors
    if (!gpsStatus.servicesEnabled || gpsStatus.permission !== 'granted') {
      return 'text-red-600';
    }
    if (isLocationLoading) {
      return 'text-blue-600';
    }

    // Tracking status colors
    if (!isTracking) return styles.textSecondary;
    if (isPaused) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusDotColor = (): string => {
    if (showRecoveryMessage) {
      return 'bg-green-500';
    }

    if (
      showGpsDisabledMessage ||
      !gpsStatus.servicesEnabled ||
      gpsStatus.permission !== 'granted'
    ) {
      return 'bg-red-500';
    }

    if (isLocationLoading) {
      return 'bg-blue-500';
    }

    if (!isTracking) {
      return theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400';
    }

    if (isPaused) {
      return 'bg-yellow-500';
    }

    return 'bg-green-500';
  };

  return (
    <View className={`${styles.cardBackground} border-b ${styles.borderColor} px-6 py-4`}>
      <Text className={`text-2xl font-bold ${styles.textPrimary} mb-1`}>Track Run</Text>
      <View className="flex-row items-center">
        <View className={`w-2 h-2 rounded-full mr-2 ${getStatusDotColor()}`} />
        <Text className={`text-sm font-medium ${getStatusColor()}`}>{getStatusMessage()}</Text>
      </View>
    </View>
  );
}
