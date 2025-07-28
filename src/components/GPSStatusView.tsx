import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from './StyledButton';
import { GPSStatus } from '../types/gps';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

const { height } = Dimensions.get('window');

interface GPSStatusViewProps {
  gpsStatus: GPSStatus;
  isLocationLoading: boolean;
  showGpsDisabledMessage: boolean;
  isTracking: boolean;
  isPaused: boolean;
  onRequestPermission: () => void;
  onDismissGpsMessage: () => void;
}

export default function GPSStatusView({
  gpsStatus,
  isLocationLoading,
  showGpsDisabledMessage,
  isTracking,
  isPaused,
  onRequestPermission,
  onDismissGpsMessage,
}: GPSStatusViewProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const styles = getThemedStyles();

  // Show GPS disabled message when GPS is lost during tracking
  if (showGpsDisabledMessage) {
    const getMessage = () => {
      if (isTracking && isPaused) {
        return 'Your run has been paused. Please enable location services to continue.';
      } else if (isTracking) {
        return 'Location services are needed to continue tracking your run.';
      } else {
        return 'Location services are required to track your run.';
      }
    };

    return (
      <View
        className={`${styles.cardBackground} items-center justify-center`}
        style={{ height: height * 0.4 }}>
        <View
          className={`${styles.cardBackground} rounded-lg p-6 items-center shadow-lg border ${styles.borderColor}`}>
          <View
            className={`w-12 h-12 ${
              theme === 'dark' ? 'bg-red-900' : 'bg-red-100'
            } rounded-full items-center justify-center mb-4`}>
            <Ionicons name="location-outline" size={24} color="#ef4444" />
          </View>
          <Text className={`text-lg font-semibold ${styles.textPrimary} mb-1`}>
            GPS Connection Lost
          </Text>
          <Text className={`text-sm ${styles.textSecondary} text-center mb-4`}>{getMessage()}</Text>
          <StyledButton
            title="Dismiss"
            onPress={onDismissGpsMessage}
            variant="secondary"
            size="sm"
          />
        </View>
      </View>
    );
  }

  // Show GPS permission/services required message
  if (gpsStatus.permission !== 'granted' || !gpsStatus.servicesEnabled) {
    return (
      <View
        className={`${styles.backgroundColor} items-center justify-center`}
        style={{ height: height * 0.4 }}>
        <View
          className={`w-16 h-16 ${
            theme === 'dark' ? 'bg-red-900' : 'bg-red-100'
          } rounded-full items-center justify-center mb-4`}>
          <Ionicons name="location-outline" size={32} color="#ef4444" />
        </View>
        <Text className={`text-lg font-semibold ${styles.textPrimary} mb-2`}>GPS Required</Text>
        <Text className={`text-sm ${styles.textSecondary} text-center px-8 mb-4`}>
          {!gpsStatus.servicesEnabled
            ? 'Please enable location services on your device'
            : 'Location permission is required to track your run'}
        </Text>
        {gpsStatus.permission !== 'granted' && gpsStatus.canAskAgain && (
          <StyledButton
            title="Enable GPS"
            onPress={onRequestPermission}
            variant="primary"
            size="sm"
          />
        )}
      </View>
    );
  }

  // Show loading screen when getting location
  if (isLocationLoading) {
    return (
      <View
        className={`${styles.cardBackground} items-center justify-center`}
        style={{ height: height * 0.4 }}>
        <View
          className={`${styles.cardBackground} rounded-lg p-6 items-center shadow-lg border ${styles.borderColor}`}>
          <View
            className={`w-12 h-12 ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
            } rounded-full items-center justify-center mb-4`}>
            <Ionicons name="location-outline" size={24} color="#3b82f6" />
          </View>
          <Text className={`text-lg font-semibold ${styles.textPrimary} mb-1`}>
            Getting your location...
          </Text>
          <Text className={`text-sm ${styles.textSecondary} text-center`}>
            Please wait while we find your position
          </Text>
        </View>
      </View>
    );
  }

  // Return null when GPS is available - map should be shown instead
  return null;
}
