import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { storageService } from './storageService';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

let isTaskDefined = false;
let lastProcessedTimestamp = 0;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Define the background task with enhanced error handling and robustness
const defineBackgroundTask = (): boolean => {
  if (isTaskDefined) return true;

  try {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      try {
        if (error) {
          consecutiveErrors++;
          console.error(
            `Background location task error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
            error,
          );

          // If too many consecutive errors, attempt to restart the task
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.warn('Too many consecutive errors, attempting to restart background task');
            consecutiveErrors = 0;
            // Could implement restart logic here if needed
          }
          return;
        }

        // Reset error counter on successful execution
        consecutiveErrors = 0;

        if (!data) {
          console.warn('Background task: No data received');
          return;
        }

        const { locations } = data as { locations: Location.LocationObject[] };

        if (!locations || locations.length === 0) {
          console.warn('Background task: No locations in data');
          return;
        }

        console.log(`Background task: Processing ${locations.length} location updates`);

        // Get current tracking data
        const currentTrackingData = await storageService.getCurrentTrackingData();

        if (
          !currentTrackingData ||
          !currentTrackingData.isTracking ||
          currentTrackingData.isPaused
        ) {
          console.log(
            'Background task: Not currently tracking or tracking is paused, skipping updates',
          );
          return;
        }

        // Enhanced location filtering with multiple criteria
        const filteredLocations = locations.filter((location) => {
          const coords = location.coords;
          const timestamp = location.timestamp;

          // Filter out locations with poor accuracy (>25m for better precision)
          if (coords.accuracy && coords.accuracy > 25) {
            console.log(
              `Background task: Filtering location with poor accuracy: ${coords.accuracy}m`,
            );
            return false;
          }

          // Filter out locations that are too old (>15 seconds)
          if (timestamp && Date.now() - timestamp > 15000) {
            console.log(`Background task: Filtering old location: ${Date.now() - timestamp}ms ago`);
            return false;
          }

          // Filter out locations that are too close in time (prevent rapid duplicates)
          if (timestamp && timestamp <= lastProcessedTimestamp) {
            console.log(
              `Background task: Filtering duplicate timestamp: ${timestamp} <= ${lastProcessedTimestamp}`,
            );
            return false;
          }

          // Filter out obviously invalid coordinates
          if (
            !coords.latitude ||
            !coords.longitude ||
            Math.abs(coords.latitude) > 90 ||
            Math.abs(coords.longitude) > 180
          ) {
            console.log('Background task: Filtering invalid coordinates');
            return false;
          }

          return true;
        });

        if (filteredLocations.length === 0) {
          console.log('Background task: All location updates filtered out');
          return;
        }

        // Process valid locations
        const processedPoints = filteredLocations.map((location) => {
          const timestamp = location.timestamp || Date.now();

          // Update last processed timestamp
          if (timestamp > lastProcessedTimestamp) {
            lastProcessedTimestamp = timestamp;
          }

          return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude || undefined,
            accuracy: location.coords.accuracy || undefined,
            timestamp: timestamp,
            source: 'background', // Mark as background source
          };
        });

        // Check for duplicates against existing route data
        const existingTimestamps = new Set(
          currentTrackingData.route
            .filter((point: any) => point.timestamp)
            .map((point: any) => point.timestamp),
        );

        const newPoints = processedPoints.filter(
          (point) => !existingTimestamps.has(point.timestamp),
        );

        if (newPoints.length === 0) {
          console.log('Background task: All location updates were duplicates, skipping');
          return;
        }

        // Add the new points to the route
        const updatedRoute = [...currentTrackingData.route, ...newPoints];

        // Save updated tracking data with enhanced error handling
        try {
          await storageService.saveCurrentTrackingData({
            ...currentTrackingData,
            route: updatedRoute,
            lastBackgroundUpdate: Date.now(),
          });

          console.log(
            `Background task: Successfully added ${newPoints.length} new location points (total route: ${updatedRoute.length} points)`,
          );
        } catch (saveError) {
          console.error('Background task: Error saving tracking data:', saveError);
          // Don't throw here to prevent task failure
        }
      } catch (taskError) {
        consecutiveErrors++;
        console.error(
          `Background task: Unexpected error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
          taskError,
        );
      }
    });

    isTaskDefined = true;
    console.log('Background location task defined successfully');
    return true;
  } catch (error) {
    console.error('Error defining background task:', error);
    return false;
  }
};

export const backgroundTaskService = {
  /**
   * Check if the background task is registered
   */
  isTaskDefined: (): boolean => {
    try {
      return TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    } catch (error) {
      console.error('Error checking if task is defined:', error);
      return false;
    }
  },

  /**
   * Start background location tracking with enhanced configuration
   */
  startBackgroundLocationTracking: async (): Promise<boolean> => {
    try {
      console.log('Starting background location tracking...');

      // First ensure the task is defined
      if (!defineBackgroundTask()) {
        console.error('Failed to define background task');
        return false;
      }

      // Check if location permissions are granted
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        console.warn('Background location permission not granted');
        return false;
      }

      // Stop any existing background tracking
      await backgroundTaskService.stopBackgroundLocationTracking();

      // Reset error counter and timestamps
      consecutiveErrors = 0;
      lastProcessedTimestamp = 0;

      // Start the background location task with optimized settings
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.LocationAccuracy.BestForNavigation,
        timeInterval: 1000, // Update every 1 second for continuous tracking
        distanceInterval: 1, // Update every 1 meter for precision
        deferredUpdatesInterval: 1000, // Process updates every second
        deferredUpdatesDistance: 1,
        mayShowUserSettingsDialog: false,
        pausesUpdatesAutomatically: false, // Prevent iOS from pausing
        foregroundService: {
          notificationTitle: 'Here2Run - GPS Tracking Active',
          notificationBody: 'Tracking your run in the background. Tap to return to the app.',
          notificationColor: '#2563eb',
        },
        // iOS specific settings
        activityType: Location.LocationActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
      });

      console.log('Background location tracking started successfully');
      return true;
    } catch (error) {
      console.error('Error starting background location tracking:', error);
      return false;
    }
  },

  /**
   * Stop background location tracking
   */
  stopBackgroundLocationTracking: async (): Promise<void> => {
    try {
      const isTaskRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isTaskRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('Background location tracking stopped');
      }

      // Reset tracking state
      consecutiveErrors = 0;
      lastProcessedTimestamp = 0;
    } catch (error) {
      console.error('Error stopping background location tracking:', error);
    }
  },

  /**
   * Check if background location tracking is currently active
   */
  isBackgroundLocationTracking: async (): Promise<boolean> => {
    try {
      return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    } catch (error) {
      console.error('Error checking background location tracking status:', error);
      return false;
    }
  },

  /**
   * Request background location permissions with enhanced flow
   */
  requestBackgroundPermissions: async (): Promise<boolean> => {
    try {
      // First check if foreground permission is granted
      const foregroundStatus = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus.status !== Location.PermissionStatus.GRANTED) {
        console.warn('Foreground location permission not granted, requesting...');
        const foregroundRequest = await Location.requestForegroundPermissionsAsync();
        if (foregroundRequest.status !== Location.PermissionStatus.GRANTED) {
          console.error('Foreground location permission denied');
          return false;
        }
      }

      // Then request background permission
      const { status } = await Location.requestBackgroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;

      if (granted) {
        console.log('Background location permission granted');
      } else {
        console.warn('Background location permission denied');
      }

      return granted;
    } catch (error) {
      console.error('Error requesting background permissions:', error);
      return false;
    }
  },

  /**
   * Get tracking statistics for debugging
   */
  getTrackingStats: () => {
    return {
      isTaskDefined: isTaskDefined,
      consecutiveErrors: consecutiveErrors,
      lastProcessedTimestamp: lastProcessedTimestamp,
    };
  },

  /**
   * Reset tracking state (useful for debugging)
   */
  resetTrackingState: () => {
    consecutiveErrors = 0;
    lastProcessedTimestamp = 0;
    console.log('Background tracking state reset');
  },
};
