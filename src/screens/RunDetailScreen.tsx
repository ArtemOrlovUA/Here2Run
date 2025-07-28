import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  Dimensions,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { Run } from '../types/run';
import MetricCard from '../components/MetricCard';
import { storageService } from '../services/storageService';
import {
  coordinatesToSegments,
  calculateDistance,
  calculateCalories,
  formatPace,
  formatDistance as utilsFormatDistance,
} from '../utils/metrics';
import StyledButton from '../components/StyledButton';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

const { height } = Dimensions.get('window');

export default function RunDetailScreen(): React.JSX.Element {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getThemedStyles();
  const [run, setRun] = useState<Run | null>(null);
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [editNameText, setEditNameText] = useState('');
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] = useState(false);

  useEffect(() => {
    loadRunDetails();
  }, []);

  const loadRunDetails = async (): Promise<void> => {
    try {
      const { runId } = route.params as { runId: string };
      const runDetails = await storageService.getRunById(runId);

      if (runDetails) {
        setRun(runDetails);

        // Fit map to route when data is loaded
        if (runDetails.route.length > 0 && mapRef.current) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(
              runDetails.route.map((point) => ({
                latitude: point.latitude,
                longitude: point.longitude,
              })),
              {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              },
            );
          }, 100);
        }
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading run details:', error);
      navigation.goBack();
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return km.toFixed(2);
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

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const renderMap = (): React.JSX.Element => {
    if (!run || run.route.length === 0) {
      return (
        <View
          className="bg-gray-100 items-center justify-center mx-4 rounded-xl"
          style={{ height: height * 0.45 }}>
          <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="map" size={32} color="#3b82f6" />
          </View>
          <Text className="text-lg font-semibold text-gray-700 mb-2">No Route Data</Text>
          <Text className="text-sm text-gray-500 text-center px-8">
            This run has no GPS route data
          </Text>
        </View>
      );
    }

    // Calculate center point for initial region
    const latitudes = run.route.map((point) => point.latitude);
    const longitudes = run.route.map((point) => point.longitude);

    const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
    const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;

    const initialRegion = {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(...latitudes) - Math.min(...latitudes) + 0.01,
      longitudeDelta: Math.max(...longitudes) - Math.min(...longitudes) + 0.01,
    };

    return (
      <View className="mx-4 rounded-xl overflow-hidden" style={{ height: height * 0.45 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
          mapType={mapType}>
          {/* Route segments with blue color */}
          {run.segments &&
            run.segments.map((segment) => {
              return (
                <Polyline
                  key={`segment-${segment.segmentIndex}`}
                  coordinates={segment.coordinates.map((coord) => ({
                    latitude: coord.latitude,
                    longitude: coord.longitude,
                  }))}
                  strokeColor="#3b82f6"
                  strokeWidth={5}
                />
              );
            })}
        </MapView>
        <View className="absolute top-2 right-2 bg-white p-2 rounded">
          <TouchableOpacity onPress={toggleMapType}>
            <MaterialCommunityIcons
              name={mapType === 'standard' ? 'map' : 'satellite-variant'}
              size={24}
              color="black"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRunInfo = (): React.JSX.Element => {
    if (!run) return <></>;

    return (
      <View className="px-4 py-6">
        {/* Date and Time */}
        <View
          className={`rounded-xl p-4 mb-4 shadow-sm border ${styles.cardBackground} ${styles.borderColor}`}>
          <Text className={`text-lg font-semibold mb-3 ${styles.textPrimary}`}>Run Details</Text>
          <View className="flex-row justify-between items-center mb-2">
            <Text className={`text-sm font-medium ${styles.textSecondary}`}>Date</Text>
            <Text className={`text-sm ${styles.textPrimary}`}>{formatDate(run.date)}</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`text-sm font-medium ${styles.textSecondary}`}>Time</Text>
            <Text className={`text-sm ${styles.textPrimary}`}>{formatTime(run.date)}</Text>
          </View>
        </View>

        <View className="flex-row mb-4 gap-x-4">
          <View className="flex-1">
            <MetricCard
              title="Distance"
              value={formatDistance(run.distance)}
              unit="km"
              icon={<Ionicons name="footsteps" size={20} color="#3b82f6" />}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              title="Duration"
              value={formatDuration(run.duration)}
              icon={<Ionicons name="time" size={20} color="#3b82f6" />}
            />
          </View>
        </View>

        <View className="flex-row mb-4 gap-x-4">
          <View className="flex-1">
            <MetricCard
              title="Average Pace"
              value={calculatePace(run.distance, run.duration)}
              unit="/km"
              icon={<Ionicons name="speedometer" size={20} color="#3b82f6" />}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              title="Calories Burned"
              value={`${run.calories}`}
              unit="kcal"
              icon={<Ionicons name="flame" size={20} color="#3b82f6" />}
            />
          </View>
        </View>

        {/* Segment Breakdown */}
        {run.segments && run.segments.length > 1 && (
          <View
            className={`rounded-xl p-4 mb-4 shadow-sm border ${styles.cardBackground} ${styles.borderColor}`}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="analytics" size={20} color="#3b82f6" />
              <Text className={`text-lg font-semibold ml-2 ${styles.textPrimary}`}>
                Segment Analysis
              </Text>
            </View>
            <Text className={`text-sm mb-4 ${styles.textSecondary}`}>
              This run was completed in {run.segments.length} segments with pause breaks
            </Text>

            {run.segments.map((segment, index) => {
              // Use segment's calculated distance if available, otherwise calculate from coordinates
              const segmentDistance =
                segment.distance ||
                segment.coordinates.reduce((dist, coord, i) => {
                  if (i === 0) return 0;
                  const prev = segment.coordinates[i - 1];
                  return (
                    dist +
                    calculateDistance(
                      prev.latitude,
                      prev.longitude,
                      coord.latitude,
                      coord.longitude,
                    )
                  );
                }, 0);

              const segmentDuration = segment.duration || 0;
              const segmentPace = formatPace(segmentDistance, segmentDuration);

              // Calculate segment percentage of total distance
              const segmentPercentage = (segmentDistance / run.distance) * 100;

              // Get pace color based on performance
              const paceInMinutes = segmentDuration / 60 / (segmentDistance / 1000);
              const averagePaceInMinutes = run.duration / 60 / (run.distance / 1000);
              const isGoodPace = paceInMinutes <= averagePaceInMinutes;

              // Inside segment map callback, compute calories and update UI
              const segmentCalories = calculateCalories(segmentDistance / 1000);

              return (
                <View key={segment.segmentIndex} className="mb-4 last:mb-0">
                  <View
                    className={`rounded-lg p-3 border ${styles.cardBackground} ${styles.borderColor}`}>
                    {/* Segment Header */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Text className={`text-lg font-bold ${styles.textPrimary}`}>
                          Segment {index + 1}
                        </Text>
                      </View>
                    </View>

                    {/* Distance Progress Bar */}
                    <View className="mb-3">
                      <View className="flex-row justify-between mb-1">
                        <Text className={`text-xs ${styles.textSecondary}`}>Distance</Text>
                        <Text className={`text-xs font-medium ${styles.textPrimary}`}>
                          {utilsFormatDistance(segmentDistance)} km ({segmentPercentage.toFixed(1)}
                          %)
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(segmentPercentage, 100)}%` }}
                        />
                      </View>
                    </View>

                    {/* Metrics Grid */}
                    <View className="flex-row justify-between">
                      <View className="flex-1 items-center">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="time-outline" size={12} color="#6b7280" />
                          <Text className={`text-xs ml-1 ${styles.textSecondary}`}>Duration</Text>
                        </View>
                        <Text className={`text-sm font-semibold ${styles.textPrimary}`}>
                          {formatDuration(segmentDuration)}
                        </Text>
                      </View>
                      <View className="flex-1 items-center">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="speedometer-outline" size={12} color="#6b7280" />
                          <Text className={`text-xs ml-1 ${styles.textSecondary}`}>Pace</Text>
                        </View>
                        <Text className={`text-sm font-semibold ${styles.textPrimary}`}>
                          {segmentPace}/km
                        </Text>
                      </View>
                      <View className="flex-1 items-center">
                        <View className="flex-row items-center mb-1">
                          <Ionicons name="flame-outline" size={12} color="#6b7280" />
                          <Text className={`text-xs ml-1 ${styles.textSecondary}`}>Calories</Text>
                        </View>
                        <Text className={`text-sm font-semibold ${styles.textPrimary}`}>
                          {segmentCalories.toFixed(0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Summary Stats */}
            <View className={`mt-2 pt-3 border-t ${styles.borderColor}`}>
              <View className="flex-row justify-between">
                <View className="flex-1 items-center">
                  <Text className={`text-xs mb-1 ${styles.textSecondary}`}>Total Segments</Text>
                  <Text className={`text-lg font-bold ${styles.textPrimary}`}>
                    {run.segments.length}
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className={`text-xs mb-1 ${styles.textSecondary}`}>
                    Avg. km per segment
                  </Text>
                  <Text className={`text-lg font-bold ${styles.textPrimary}`}>
                    {utilsFormatDistance(run.distance / run.segments.length)} km
                  </Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className={`text-xs mb-1 ${styles.textSecondary}`}>
                    Avg. cal. per segment
                  </Text>
                  <Text className={`text-lg font-bold ${styles.textPrimary}`}>
                    {Math.round(run.calories / run.segments.length)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  if (!run) {
    return (
      <View className={`flex-1 ${styles.backgroundColor}`} style={{ paddingTop: insets.top }}>
        <StatusBar
          barStyle={styles.statusBarStyle as any}
          backgroundColor={styles.statusBarBgColor}
        />
        <View className="flex-1 items-center justify-center">
          <Text className={`text-lg ${styles.textSecondary}`}>Loading run details...</Text>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <View className={`${styles.cardBackground} border-b ${styles.borderColor} px-6 py-4`}>
      <Text className={`text-xl font-bold ${styles.textPrimary}`} numberOfLines={1}>
        {truncateText(run.name || `${formatDistance(run.distance)} km Run`, 50)}
      </Text>
      <Text className={`text-sm ${styles.textSecondary}`}>
        {formatDate(run.date)} at {formatTime(run.date)}
      </Text>
    </View>
  );

  const handleEditName = () => {
    setEditNameText(run?.name || '');
    setEditNameModalVisible(true);
  };

  const handleSaveRunName = async () => {
    if (run) {
      try {
        const trimmedName = editNameText.trim();
        await storageService.updateRunName(run.id, trimmedName);
        setRun({ ...run, name: trimmedName });
        setEditNameModalVisible(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to update run name');
      }
    } else {
      setEditNameModalVisible(false);
    }
  };

  const handleCancelEditName = () => {
    setEditNameModalVisible(false);
    setEditNameText('');
  };

  const handleDelete = () => {
    setDeleteConfirmModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (run) {
      try {
        await storageService.deleteRun(run.id);
        setDeleteConfirmModalVisible(false);
        navigation.goBack();
      } catch (error) {
        Alert.alert('Error', 'Failed to delete run');
        setDeleteConfirmModalVisible(false);
      }
    } else {
      setDeleteConfirmModalVisible(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModalVisible(false);
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  return (
    <View className={`flex-1 ${styles.backgroundColor}`} style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom) }}>
        {renderHeader()}
        <View className="px-4 py-4 flex-row justify-between">
          <StyledButton title="Edit Name" onPress={handleEditName} variant="secondary" />
          <StyledButton title="Delete" onPress={handleDelete} variant="danger" />
        </View>
        {renderMap()}

        {renderRunInfo()}
      </ScrollView>

      <Modal
        visible={editNameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEditName}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <BlurView
            intensity={20}
            tint={theme === 'dark' ? 'dark' : 'light'}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 24,
              backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
            }}
            experimentalBlurMethod="dimezisBlurView">
            <TouchableOpacity
              style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={handleCancelEditName}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}}
                style={{ width: '100%', maxWidth: 400 }}>
                <View className={`${styles.cardBackground} rounded-2xl p-6 shadow-lg`}>
                  <Text className={`text-lg font-semibold ${styles.textPrimary} mb-4 text-center`}>
                    Edit Run Name
                  </Text>
                  <TextInput
                    className={`border ${styles.borderColor} rounded-lg p-3 mb-6 ${styles.textPrimary} ${styles.backgroundColor}`}
                    placeholder="Enter run name"
                    value={editNameText}
                    onChangeText={setEditNameText}
                    autoFocus={true}
                    maxLength={35}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveRunName}
                  />
                  <View className="flex-row gap-x-3">
                    <View className="flex-1">
                      <StyledButton
                        title="Cancel"
                        onPress={handleCancelEditName}
                        variant="secondary"
                        fullWidth
                      />
                    </View>
                    <View className="flex-1">
                      <StyledButton
                        title="Save"
                        onPress={handleSaveRunName}
                        variant="primary"
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <BlurView
            intensity={20}
            tint={theme === 'dark' ? 'dark' : 'light'}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 24,
              backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
            }}
            experimentalBlurMethod="dimezisBlurView">
            <TouchableOpacity
              style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={handleCancelDelete}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {}}
                style={{ width: '100%', maxWidth: 400 }}>
                <View className={`${styles.cardBackground} rounded-2xl p-6 shadow-lg`}>
                  <Text className={`text-lg font-semibold ${styles.textPrimary} mb-2 text-center`}>
                    Delete Run
                  </Text>
                  <Text className={`text-sm ${styles.textSecondary} mb-6 text-center`}>
                    Are you sure you want to delete this run? This action cannot be undone.
                  </Text>
                  <View className="flex-row gap-x-3">
                    <View className="flex-1">
                      <StyledButton
                        title="Cancel"
                        onPress={handleCancelDelete}
                        variant="secondary"
                        fullWidth
                      />
                    </View>
                    <View className="flex-1">
                      <StyledButton
                        title="Delete"
                        onPress={handleConfirmDelete}
                        variant="danger"
                        fullWidth
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}
