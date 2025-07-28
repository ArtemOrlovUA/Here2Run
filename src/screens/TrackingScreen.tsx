import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StatusBar, Dimensions, Alert, Text, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Region } from 'react-native-maps';
import TrackingHeader from '../components/TrackingHeader';
import GPSStatusView from '../components/GPSStatusView';
import TrackingMap from '../components/TrackingMap';
import TrackingMetrics from '../components/TrackingMetrics';
import TrackingControls from '../components/TrackingControls';
import {
  locationService,
  LocationPermissionStatus,
  UserLocation,
} from '../services/locationService';
import { GPSStatus } from '../types/gps';
import { storageService } from '../services/storageService';
import { batteryOptimizationService } from '../services/batteryOptimizationService';
import { backgroundTaskService } from '../services/backgroundTask';
import { RouteCoordinate, Run, RouteSegment } from '../types/run';
import {
  calculateTotalDistance,
  calculateTotalDistanceFromSegments,
  coordinatesToSegments,
  formatDuration,
  formatPace,
  formatDistance,
  calculateCalories,
  calculateDistance,
  getColorForPace,
} from '../utils/metrics';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

const { width, height } = Dimensions.get('window');

export default function TrackingScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteCoordinate[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [currentSegmentStartTime, setCurrentSegmentStartTime] = useState<number | null>(null);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>({
    permission: 'not-requested',
    servicesEnabled: false,
    canAskAgain: true,
  });
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [metricsRefresh, setMetricsRefresh] = useState<number>(0);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [showGpsDisabledMessage, setShowGpsDisabledMessage] = useState(false);

  // Simple map tracking mode - either follows user or is in manual mode
  const [mapTrackingMode, setMapTrackingMode] = useState<'follow' | 'manual'>('follow');

  const [showRecoveryMessage, setShowRecoveryMessage] = useState(false);

  // === Refs to keep latest mutable state inside callbacks ===
  const isTrackingRef = useRef(isTracking);
  const isPausedRef = useRef(isPaused);
  const currentRunIdRef = useRef(currentRunId);
  const startTimeRef = useRef(startTime);
  const currentSegmentIndexRef = useRef(currentSegmentIndex);
  const currentSegmentStartTimeRef = useRef(currentSegmentStartTime);
  const segmentsRef = useRef(segments);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    currentRunIdRef.current = currentRunId;
  }, [currentRunId]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);

  useEffect(() => {
    currentSegmentStartTimeRef.current = currentSegmentStartTime;
  }, [currentSegmentStartTime]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  const mapRef = useRef<MapView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationTime = useRef<number>(0);
  const isLocationUpdateInProgress = useRef<boolean>(false);
  const isMapAnimationInProgress = useRef<boolean>(false);

  // Calculate current metrics with better real-time updates
  const getCurrentStats = useCallback(() => {
    const segments = coordinatesToSegments(route);
    const distance = calculateTotalDistanceFromSegments(segments);
    const duration = isTracking && startTime ? elapsedTime : 0;
    const calories = calculateCalories(distance / 1000); // Convert meters to km

    return {
      distance: formatDistance(distance),
      duration: formatDuration(duration),
      pace: formatPace(distance, duration),
      calories: calories.toString(),
    };
  }, [route, isTracking, startTime, elapsedTime, metricsRefresh]);

  // Fast timer for elapsed time updates (300ms for smooth display)
  useEffect(() => {
    if (isTracking && !isPaused && startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const newElapsedTime = Math.floor((now - startTime - totalPausedTime) / 1000);
        setElapsedTime(newElapsedTime);
        // Force metrics refresh to ensure real-time updates
        setMetricsRefresh((prev) => prev + 1);
      }, 300); // Faster updates for smoother timer display
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking, isPaused, startTime, totalPausedTime]);

  // Separate interval for heavy operations (data saving and battery checks)
  useEffect(() => {
    let saveInterval: NodeJS.Timeout | null = null;
    let batteryCheckInterval: NodeJS.Timeout | null = null;

    if (isTracking && !isPaused && currentRunId) {
      // Save tracking data every 5 seconds (less frequent to avoid performance impact)
      saveInterval = setInterval(async () => {
        try {
          await storageService.saveCurrentTrackingData({
            id: currentRunId,
            startTime: startTime!,
            route,
            isTracking: true,
            isPaused: false,
            currentSegmentIndex,
            totalPausedTime,
            pauseStartTime: null,
            currentSegmentStartTime,
            elapsedTime,
          });
        } catch (error) {
          console.error('Error saving periodic tracking data:', error);
        }
      }, 5000);

      // Check battery optimization every 5 minutes
      batteryCheckInterval = setInterval(async () => {
        try {
          const trackingStats = locationService.getTrackingStatus();
          const backgroundStats = {
            lastLocationTime: trackingStats.lastLocationTime,
            consecutiveErrors: trackingStats.consecutiveErrors,
            isBackgroundActive: await backgroundTaskService.isBackgroundLocationTracking(),
          };

          const hasIssues = await batteryOptimizationService.checkBatteryOptimizationImpact(
            backgroundStats,
          );
          if (hasIssues) {
            batteryOptimizationService.showBatteryOptimizationHelp();
          }
        } catch (error) {
          console.error('Error checking battery optimization impact:', error);
        }
      }, 300000); // 5 minutes
    }

    return () => {
      if (saveInterval) clearInterval(saveInterval);
      if (batteryCheckInterval) clearInterval(batteryCheckInterval);
    };
  }, [
    isTracking,
    isPaused,
    currentRunId,
    startTime,
    route,
    currentSegmentIndex,
    currentSegmentStartTime,
    totalPausedTime,
  ]);

  // Force metrics recalculation when route changes
  useEffect(() => {
    if (isTracking && route.length > 0) {
      // Trigger metrics refresh when route updates
      setMetricsRefresh((prev) => prev + 1);
    }
  }, [route.length, isTracking]);

  // Handle map centering when in follow mode (regardless of tracking status)
  useEffect(() => {
    const shouldFollow = !isTracking || mapTrackingMode === 'follow';
    if (
      shouldFollow &&
      userLocation &&
      mapRef.current &&
      !isMapAnimationInProgress.current &&
      initialLocationLoaded // Only center after initial location is loaded
    ) {
      isMapAnimationInProgress.current = true;
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500,
      );
      // Reset animation flag after animation completes
      setTimeout(() => {
        isMapAnimationInProgress.current = false;
      }, 500);
    }
  }, [userLocation, mapTrackingMode, initialLocationLoaded, isTracking]);

  // Load existing tracking data on mount
  useEffect(() => {
    const loadExistingTrackingData = async () => {
      const existingData = await storageService.getCurrentTrackingData();
      if (existingData && existingData.isTracking) {
        console.log('Recovering existing tracking session:', existingData);

        // Set all tracking state
        setIsTracking(true);
        setIsPaused(true); // Always start in paused state when recovering
        setStartTime(existingData.startTime);
        setCurrentRunId(existingData.id);
        setRoute(existingData.route || []);
        setCurrentSegmentIndex(existingData.currentSegmentIndex || 0);
        setCurrentSegmentStartTime(existingData.currentSegmentStartTime || existingData.startTime);

        // Use stored elapsed time instead of recalculating to prevent counting time when app was closed
        const now = Date.now();
        const storedElapsedTime = existingData.elapsedTime || 0;
        setElapsedTime(storedElapsedTime);

        // Set total paused time and current pause start time
        setTotalPausedTime(existingData.totalPausedTime || 0);
        setPauseStartTime(now); // Set current time as pause start for recovery

        // Show recovery message briefly
        setShowRecoveryMessage(true);
        setTimeout(() => setShowRecoveryMessage(false), 3000);

        console.log(
          `Recovered run: elapsed=${storedElapsedTime}s, paused=${
            existingData.totalPausedTime || 0
          }s, route points=${existingData.route?.length || 0}`,
        );
      }
    };

    loadExistingTrackingData();
  }, []);

  // Removed automatic restart location tracking - user must manually resume

  // Check GPS status when screen becomes focused
  useFocusEffect(
    React.useCallback(() => {
      checkGPSStatus(true); // Show loading for initial focus
    }, []),
  );

  // Show battery optimization alert on first app launch
  useEffect(() => {
    const showFirstLaunchBatteryAlert = async () => {
      try {
        // Only show on Android devices
        if (Platform.OS === 'android') {
          await batteryOptimizationService.showBatteryOptimizationAlert();
        }
      } catch (error) {
        console.error('Error showing battery optimization alert:', error);
      }
    };

    showFirstLaunchBatteryAlert();
  }, []);

  // Continuous GPS monitoring - check every 2 seconds when on screen
  useEffect(() => {
    const interval = setInterval(() => {
      checkGPSStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Additional frequent checking when GPS is not available
  useEffect(() => {
    if (!gpsStatus.servicesEnabled || gpsStatus.permission !== 'granted') {
      const interval = setInterval(checkGPSStatus, 500);
      return () => clearInterval(interval);
    }
  }, [gpsStatus]);

  const checkGPSStatus = async (showLoading = false): Promise<void> => {
    try {
      // Only show loading indicator for initial load or explicit user requests
      if (showLoading && !initialLocationLoaded) {
        setIsLocationLoading(true);
      }

      // Check if location services are enabled
      const servicesEnabled = await locationService.isLocationServicesEnabled();

      // Check permission status
      const permissionStatus = await locationService.checkLocationPermission();

      const newGpsStatus: GPSStatus = {
        permission: permissionStatus.granted ? 'granted' : 'denied',
        servicesEnabled,
        canAskAgain: permissionStatus.canAskAgain,
      };

      // Check if GPS status changed from good to bad
      const wasGpsGood = gpsStatus.servicesEnabled && gpsStatus.permission === 'granted';
      const isGpsGood = servicesEnabled && permissionStatus.granted;

      if (wasGpsGood && !isGpsGood) {
        // GPS was lost
        handleGpsLost();
      } else if (!wasGpsGood && isGpsGood) {
        // GPS was restored
        handleGpsRestored();
      }

      setGpsStatus(newGpsStatus);

      // If we have permission and services are enabled, get current location
      if (permissionStatus.granted && servicesEnabled) {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setUserLocation(location);

          // Mark initial location as loaded
          if (!initialLocationLoaded) {
            setInitialLocationLoaded(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking GPS status:', error);
    } finally {
      // Only hide loading if we showed it
      if (showLoading && !initialLocationLoaded) {
        setIsLocationLoading(false);
      }
    }
  };

  const requestLocationPermission = async (): Promise<void> => {
    try {
      setIsLocationLoading(true);
      const permissionResult = await locationService.requestLocationPermission();

      if (permissionResult.granted) {
        // Permission granted, check GPS status again
        await checkGPSStatus(true);
      } else {
        setGpsStatus((prev) => ({
          ...prev,
          permission: 'denied',
          canAskAgain: permissionResult.canAskAgain,
        }));

        if (!permissionResult.canAskAgain) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location permission in your device settings to use this feature.',
            [{ text: 'OK' }],
          );
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleLocationUpdate = useCallback((location: UserLocation) => {
    // Read latest values from refs to avoid stale closures
    const tracking = isTrackingRef.current;
    const paused = isPausedRef.current;
    const runId = currentRunIdRef.current;
    const runStartTime = startTimeRef.current;

    console.log(
      'Location update received:',
      location.latitude,
      location.longitude,
      'Accuracy:',
      location.accuracy,
      'Tracking:',
      tracking,
      'Paused:',
      paused,
    );

    // Prevent concurrent updates
    if (isLocationUpdateInProgress.current) {
      console.log('Skipping location update - update in progress');
      return;
    }

    if (!tracking || paused) {
      console.log('Skipping location update - not tracking or paused');
      setUserLocation(location); // Still update user location for map centering
      return;
    }

    // Filter out locations with poor accuracy or too frequent updates
    const now = Date.now();
    const timeSinceLastUpdate = now - lastLocationTime.current;
    const hasGoodAccuracy = !location.accuracy || location.accuracy <= 50; // Relaxed threshold

    if (timeSinceLastUpdate < 500 || !hasGoodAccuracy) {
      console.log(
        `Filtering location: time=${timeSinceLastUpdate}ms, accuracy=${location.accuracy}m`,
      );
      return;
    }

    isLocationUpdateInProgress.current = true;
    lastLocationTime.current = now;

    const newPoint: RouteCoordinate = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      timestamp: location.timestamp || Date.now(),
      source: 'foreground', // Mark as foreground source
      segmentIndex: currentSegmentIndexRef.current,
    };

    setRoute((prevRoute) => {
      const updatedRoute = [...prevRoute, newPoint];
      console.log('Route updated, new length:', updatedRoute.length);

      // Save current tracking data asynchronously
      if (runId && runStartTime) {
        storageService
          .saveCurrentTrackingData({
            id: runId,
            startTime: runStartTime,
            route: updatedRoute,
            isTracking: true,
            isPaused: false,
            currentSegmentIndex: currentSegmentIndexRef.current,
            totalPausedTime,
            pauseStartTime: null,
            currentSegmentStartTime: currentSegmentStartTimeRef.current,
            elapsedTime,
          })
          .catch((error) => {
            console.error('Error saving tracking data:', error);
          });
      }

      return updatedRoute;
    });

    setUserLocation(location);

    // Reset update flag
    isLocationUpdateInProgress.current = false;
  }, []);

  const handleGpsDisabled = async (): Promise<void> => {
    console.log('GPS disabled during tracking, pausing run');
    setShowGpsDisabledMessage(true);

    // Pause the run if it's currently active and not already paused
    if (isTracking && !isPaused) {
      await handlePauseResume();
    }
  };

  const handleGpsLost = (): void => {
    console.log('GPS lost, showing disabled message');
    setShowGpsDisabledMessage(true);

    // If currently tracking and not paused, pause the run
    if (isTracking && !isPaused) {
      handlePauseResume().catch((error) => {
        console.error('Error pausing run due to GPS loss:', error);
      });
    }
  };

  const handleGpsRestored = (): void => {
    console.log('GPS restored, hiding disabled message');
    setShowGpsDisabledMessage(false);
  };

  const handleStartRun = async (): Promise<void> => {
    try {
      // Check permissions first
      const hasPermissions = await locationService.hasRunTrackingPermissions();
      if (!hasPermissions) {
        const granted = await locationService.requestRunTrackingPermissions();
        if (!granted) {
          Alert.alert(
            'Permissions Required',
            'Location permissions are required to track your run.',
          );
          return;
        }
      }

      const runId = `run_${Date.now()}`;
      const now = Date.now();

      setIsTracking(true);
      setIsPaused(false);
      setStartTime(now);
      setCurrentRunId(runId);
      setRoute([]);
      setCurrentSegmentIndex(0);
      setCurrentSegmentStartTime(now);
      setSegments([]);
      setElapsedTime(0);
      setTotalPausedTime(0);
      setPauseStartTime(null);

      // Save initial tracking data
      await storageService.saveCurrentTrackingData({
        id: runId,
        startTime: now,
        route: [],
        isTracking: true,
        isPaused: false,
        currentSegmentIndex: 0,
        totalPausedTime: 0,
        pauseStartTime: null,
        currentSegmentStartTime: now,
        elapsedTime: 0,
      });

      // Sync refs immediately to ensure callback has up-to-date values
      isTrackingRef.current = true;
      isPausedRef.current = false;
      currentRunIdRef.current = runId;
      startTimeRef.current = now;
      currentSegmentStartTimeRef.current = now;
      segmentsRef.current = [];

      // Reset location timing for new run
      lastLocationTime.current = now;
      isLocationUpdateInProgress.current = false;

      // Start location tracking
      const trackingStarted = await locationService.startRunTracking(
        handleLocationUpdate,
        (error) => {
          console.error('Location tracking error:', error);
        },
      );

      if (!trackingStarted) {
        Alert.alert(
          'Error',
          'Failed to start run tracking. Please check your permissions and location services.',
        );
        // Clean up state on failure
        setIsTracking(false);
        setIsPaused(false);
        setStartTime(null);
        setCurrentRunId(null);
        setRoute([]);
        setCurrentSegmentIndex(0);
        setElapsedTime(0);
        setTotalPausedTime(0);
        setPauseStartTime(null);
        await storageService.clearCurrentTrackingData();
      } else {
        console.log('Run tracking started successfully');

        // Start GPS monitoring when tracking is active
        await locationService.startGPSMonitoring(handleGpsDisabled, (error) => {
          console.error('GPS monitoring error:', error);
        });
      }
    } catch (error) {
      console.error('Error starting run:', error);
      Alert.alert('Error', 'An error occurred while starting the run. Please try again.');
    }
  };

  const handlePauseResume = async (): Promise<void> => {
    const now = Date.now();

    if (isPaused) {
      // Check GPS status before resuming
      if (!gpsStatus.servicesEnabled || gpsStatus.permission !== 'granted') {
        Alert.alert(
          'GPS Required',
          'Location services must be enabled to resume tracking your run.',
          [{ text: 'OK' }],
        );
        return;
      }

      // Resuming - add the time spent paused to total paused time
      if (pauseStartTime) {
        const timeSpentPaused = now - pauseStartTime;
        setTotalPausedTime((prev) => prev + timeSpentPaused);
        setPauseStartTime(null);
      }
      setIsPaused(false);
      isPausedRef.current = false;
      lastLocationTime.current = Date.now(); // Reset timing for location filtering

      // Start new segment after resume
      const newSegmentIndex = currentSegmentIndex + 1;
      setCurrentSegmentIndex(newSegmentIndex);
      setCurrentSegmentStartTime(now);
      currentSegmentStartTimeRef.current = now;

      // Restart location tracking when resuming
      try {
        const trackingStarted = await locationService.startRunTracking(
          handleLocationUpdate,
          (error) => {
            console.error('Location tracking error on resume:', error);
          },
        );
        if (!trackingStarted) {
          console.warn('Failed to restart location tracking on resume');
        } else {
          // Restart GPS monitoring when resuming
          await locationService.startGPSMonitoring(handleGpsDisabled, (error) => {
            console.error('GPS monitoring error:', error);
          });
        }
      } catch (error) {
        console.error('Error restarting tracking on resume:', error);
      }
    } else {
      // Pausing - finalize current segment before stopping
      if (currentSegmentStartTime) {
        // Calculate segment metrics
        const currentSegmentCoords = route.filter(
          (coord) => coord.segmentIndex === currentSegmentIndex,
        );
        const segmentDistance = currentSegmentCoords.reduce((dist, coord, i) => {
          if (i === 0) return 0;
          const prev = currentSegmentCoords[i - 1];
          return (
            dist + calculateDistance(prev.latitude, prev.longitude, coord.latitude, coord.longitude)
          );
        }, 0);

        const segmentDuration = Math.floor((now - currentSegmentStartTime) / 1000);

        // Create segment with metrics
        const newSegment: RouteSegment = {
          segmentIndex: currentSegmentIndex,
          coordinates: currentSegmentCoords,
          distance: segmentDistance,
          duration: segmentDuration,
          startTime: currentSegmentStartTime,
          endTime: now,
        };

        // Add segment to segments array
        setSegments((prev) => [...prev, newSegment]);
        segmentsRef.current = [...segmentsRef.current, newSegment];
      }

      setPauseStartTime(now);
      setIsPaused(true);
      isPausedRef.current = true;

      // Stop location tracking to save battery during pause
      try {
        await locationService.stopRunTracking();
        console.log('Location tracking stopped for pause');
      } catch (error) {
        console.error('Error stopping tracking on pause:', error);
      }
    }

    // Update stored tracking data
    if (currentRunId && startTime) {
      await storageService.saveCurrentTrackingData({
        id: currentRunId,
        startTime,
        route,
        isTracking: true,
        isPaused: !isPaused,
        currentSegmentIndex: currentSegmentIndex,
        totalPausedTime: !isPaused ? totalPausedTime : totalPausedTime,
        pauseStartTime: !isPaused ? now : null,
        currentSegmentStartTime: currentSegmentStartTime,
        elapsedTime,
      });
    }
  };

  const handleStopAndReview = async (): Promise<void> => {
    const now = Date.now();
    // Stop tracking if not already paused
    if (!isPaused) {
      setPauseStartTime(now);
      setIsPaused(true);
      isPausedRef.current = true;

      // Stop location tracking
      try {
        await locationService.stopRunTracking();
      } catch (error) {
        console.error('Error stopping tracking on stop:', error);
      }
    }

    // Navigate to RunReview with enhanced segments
    try {
      // Use the exact same calculation as getCurrentStats to ensure consistency
      const segments = coordinatesToSegments(route);
      const distance = calculateTotalDistanceFromSegments(segments);
      const duration = elapsedTime;
      const calories = calculateCalories(distance / 1000);

      const tempRun: Run = {
        id: currentRunId!,
        date: startTime!,
        distance,
        duration,
        calories,
        name: '',
        route,
        segments,
      };
      navigation.navigate('RunReview', { tempRun });
    } catch (error) {
      console.error('Error navigating to review:', error);
    }
  };

  const handleQuitRun = async (): Promise<void> => {
    // Reset tracking screen when Quit Run is clicked
    await stopTrackingAndCleanup();
  };

  const stopTrackingAndCleanup = async (): Promise<void> => {
    try {
      // Stop location tracking
      await locationService.stopRunTracking();

      // Clear state
      setIsTracking(false);
      setIsPaused(false);
      isTrackingRef.current = false;
      isPausedRef.current = false;
      setStartTime(null);
      setCurrentRunId(null);
      currentRunIdRef.current = null;
      setRoute([]);
      setCurrentSegmentIndex(0);
      setElapsedTime(0);
      setTotalPausedTime(0);
      setPauseStartTime(null);
      setMapTrackingMode('follow'); // Reset to follow mode

      // Clear stored tracking data
      await storageService.clearCurrentTrackingData();
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  const handleMapTypeToggle = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  const handleUserMapInteraction = useCallback(() => {
    // Ignore interactions caused by programmatic animations
    if (isMapAnimationInProgress.current) return;

    // Switch to manual mode only while actively tracking
    if (isTracking) {
      setMapTrackingMode('manual');
    }
  }, [isTracking]);

  const handleCenterMap = useCallback(() => {
    // Switch back to follow mode - the useEffect will handle the centering
    setMapTrackingMode('follow');
  }, []);

  const handleDismissGpsMessage = () => {
    setShowGpsDisabledMessage(false);
    // Check GPS status again to see if it's been re-enabled
    checkGPSStatus(true);
  };

  const renderMapArea = (): React.JSX.Element => {
    // Check if we should show GPS status view
    const shouldShowGpsStatus =
      gpsStatus.permission !== 'granted' ||
      !gpsStatus.servicesEnabled ||
      isLocationLoading ||
      showGpsDisabledMessage;

    if (shouldShowGpsStatus) {
      return (
        <GPSStatusView
          gpsStatus={gpsStatus}
          isLocationLoading={isLocationLoading}
          showGpsDisabledMessage={showGpsDisabledMessage}
          isTracking={isTracking}
          isPaused={isPaused}
          onRequestPermission={requestLocationPermission}
          onDismissGpsMessage={handleDismissGpsMessage}
        />
      );
    }

    // Show map when GPS is available
    return (
      <TrackingMap
        route={route}
        userLocation={userLocation}
        isTracking={isTracking}
        isPaused={isPaused}
        mapType={mapType}
        onMapTypeToggle={handleMapTypeToggle}
        mapRef={mapRef}
        mapTrackingMode={mapTrackingMode}
        onUserInteraction={handleUserMapInteraction}
        onCenterMap={handleCenterMap}
      />
    );
  };

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View className={`flex-1 ${styles.cardBackground}`} style={{ paddingTop: insets.top }}>
      <StatusBar
        barStyle={styles.statusBarStyle as any}
        backgroundColor={styles.statusBarBgColor}
      />

      {/* Header with Status */}
      <TrackingHeader
        isTracking={isTracking}
        isPaused={isPaused}
        gpsStatus={gpsStatus}
        isLocationLoading={isLocationLoading}
        showRecoveryMessage={showRecoveryMessage}
        showGpsDisabledMessage={showGpsDisabledMessage}
      />

      {/* Map Area */}
      {renderMapArea()}

      {/* Metrics */}
      <TrackingMetrics
        distance={getCurrentStats().distance}
        duration={getCurrentStats().duration}
        pace={getCurrentStats().pace}
        calories={getCurrentStats().calories}
      />

      {/* Controls */}
      <View style={{ paddingBottom: insets.bottom }}>
        <TrackingControls
          isTracking={isTracking}
          isPaused={isPaused}
          gpsStatus={gpsStatus}
          onStartRun={handleStartRun}
          onPauseResume={handlePauseResume}
          onStopAndReview={handleStopAndReview}
          onQuitRun={handleQuitRun}
        />
      </View>
    </View>
  );
}
