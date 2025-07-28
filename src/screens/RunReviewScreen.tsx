import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MetricCard from '../components/MetricCard';
import StyledButton from '../components/StyledButton';
import { storageService } from '../services/storageService';
import { locationService } from '../services/locationService';
import { Run } from '../types/run';
import {
  calculateTotalDistanceFromSegments,
  coordinatesToSegments,
  formatDuration,
  formatPace,
  formatDistance,
  calculateCalories,
  calculateDistance,
  getColorForPace,
} from '../utils/metrics';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

const { height } = Dimensions.get('window');

export default function RunReviewScreen(): React.JSX.Element {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getThemedStyles();
  const { tempRun } = route.params as { tempRun: Run };
  const [runName, setRunName] = useState('');
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const mapRef = useRef<MapView>(null);

  const segments = coordinatesToSegments(tempRun.route);
  const distance = calculateTotalDistanceFromSegments(segments);
  const duration = tempRun.duration;
  const pace = formatPace(distance, duration);
  const calories = calculateCalories(distance / 1000);

  const handleSave = async () => {
    try {
      const runToSave = {
        ...tempRun,
        distance, // Use the recalculated distance
        calories, // Use the recalculated calories
        name: runName.trim() || `${formatDistance(distance)} km Run`,
        segments,
      };
      await storageService.saveRun(runToSave);
      await locationService.stopRunTracking();
      await storageService.clearCurrentTrackingData();
      navigation.navigate('MainTabs', { screen: 'History' });
    } catch (error) {
      Alert.alert('Error', 'Failed to save run.');
    }
  };

  const handleCancel = async () => {
    await locationService.stopRunTracking();
    await storageService.clearCurrentTrackingData();
    navigation.goBack();
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  return (
    <View className={`flex-1 ${styles.backgroundColor}`} style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom }}>
        <View className="p-4">
          <TextInput
            className={`${styles.cardBackground} p-4 rounded-lg border ${styles.borderColor} mb-4 ${styles.textPrimary}`}
            placeholder="Enter run name"
            placeholderTextColor={theme === 'dark' ? '#9ca3af' : '#6b7280'}
            value={runName}
            onChangeText={setRunName}
            maxLength={35}
          />
          <View
            style={{ height: height * 0.4 }}
            className="mb-4 rounded-lg overflow-hidden relative">
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              mapType={mapType}
              initialRegion={{
                latitude: tempRun.route[0]?.latitude || 0,
                longitude: tempRun.route[0]?.longitude || 0,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onMapReady={() => {
                if (tempRun.route.length > 1) {
                  mapRef.current?.fitToCoordinates(
                    tempRun.route.map((point) => ({
                      latitude: point.latitude,
                      longitude: point.longitude,
                    })),
                    { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true },
                  );
                }
              }}>
              {/* Route segments with blue color */}
              {segments.map((segment) => {
                return (
                  <Polyline
                    key={`segment-${segment.segmentIndex}`}
                    coordinates={segment.coordinates.map((coord) => ({
                      latitude: coord.latitude,
                      longitude: coord.longitude,
                    }))}
                    strokeColor="#3b82f6"
                    strokeWidth={6}
                  />
                );
              })}
            </MapView>

            {/* Map type toggle button */}
            <View className="absolute top-2 right-2 bg-white p-2 rounded">
              <TouchableOpacity
                onPress={toggleMapType}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <MaterialCommunityIcons
                  name={mapType === 'standard' ? 'map' : 'satellite-variant'}
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row mb-4 gap-x-4">
            <View className="flex-1">
              <MetricCard
                title="Distance"
                value={formatDistance(distance)}
                unit="km"
                icon={<Ionicons name="footsteps" size={20} color="#3b82f6" />}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Duration"
                value={formatDuration(duration)}
                icon={<Ionicons name="time" size={20} color="#3b82f6" />}
              />
            </View>
          </View>

          <View className="flex-row mb-4 gap-x-4">
            <View className="flex-1">
              <MetricCard
                title="Pace"
                value={pace}
                unit="/km"
                icon={<Ionicons name="speedometer" size={20} color="#3b82f6" />}
              />
            </View>
            <View className="flex-1">
              <MetricCard
                title="Calories"
                value={calories.toString()}
                unit="kcal"
                icon={<Ionicons name="flame" size={20} color="#3b82f6" />}
              />
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <StyledButton title="Cancel" variant="danger" onPress={handleCancel} fullWidth />
            </View>
            <View className="flex-1 ml-2">
              <StyledButton title="Save" variant="primary" onPress={handleSave} fullWidth />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
