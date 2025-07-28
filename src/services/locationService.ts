import * as Location from 'expo-location';
import { backgroundTaskService } from './backgroundTask';

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: number;
  speed?: number;
  heading?: number;
}

class LocationService {
  private currentLocationSubscription: Location.LocationSubscription | null = null;
  private gpsMonitoringInterval: NodeJS.Timeout | null = null;
  private lastLocationTime: number = 0;
  private consecutiveErrors: number = 0;
  private isTrackingActive: boolean = false;

  /**
   * Request location permissions from the user
   */
  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
      };
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Check current location permission status
   */
  async checkLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
      };
    } catch (error) {
      console.error('Error checking location permission:', error);
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Check if location services are enabled on the device
   */
  async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get the current user location with enhanced accuracy
   */
  async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const permissionStatus = await this.checkLocationPermission();
      if (!permissionStatus.granted) {
        throw new Error('Location permission not granted');
      }

      const servicesEnabled = await this.isLocationServicesEnabled();
      if (!servicesEnabled) {
        throw new Error('Location services not enabled');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.LocationAccuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start watching location changes for real-time tracking with enhanced settings
   */
  async startLocationTracking(
    onLocationUpdate: (location: UserLocation) => void,
    onError?: (error: string) => void,
  ): Promise<boolean> {
    try {
      const permissionStatus = await this.checkLocationPermission();
      if (!permissionStatus.granted) {
        onError?.('Location permission not granted');
        return false;
      }

      const servicesEnabled = await this.isLocationServicesEnabled();
      if (!servicesEnabled) {
        onError?.('Location services not enabled');
        return false;
      }

      // Stop any existing subscription
      await this.stopLocationTracking();

      // Reset tracking state
      this.lastLocationTime = 0;
      this.consecutiveErrors = 0;
      this.isTrackingActive = true;

      console.log('Starting foreground location tracking with enhanced settings');

      this.currentLocationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.LocationAccuracy.BestForNavigation,
          timeInterval: 1000, // Update every 1 second for continuous tracking
          distanceInterval: 1, // Update every 1 meter for precision
          mayShowUserSettingsDialog: false,
        },
        (location) => {
          try {
            // Enhanced location filtering
            const now = Date.now();
            const timestamp = location.timestamp || now;

            // Filter out locations that are too close in time (prevent rapid duplicates)
            if (timestamp - this.lastLocationTime < 800) {
              console.log('Foreground: Filtering rapid location update');
              return;
            }

            // Filter out locations with poor accuracy
            if (location.coords.accuracy && location.coords.accuracy > 25) {
              console.log(
                `Foreground: Filtering location with poor accuracy: ${location.coords.accuracy}m`,
              );
              return;
            }

            // Filter out invalid coordinates
            if (
              !location.coords.latitude ||
              !location.coords.longitude ||
              Math.abs(location.coords.latitude) > 90 ||
              Math.abs(location.coords.longitude) > 180
            ) {
              console.log('Foreground: Filtering invalid coordinates');
              return;
            }

            this.lastLocationTime = timestamp;
            this.consecutiveErrors = 0; // Reset error counter on successful location

            const userLocation: UserLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || undefined,
              altitude: location.coords.altitude || undefined,
              speed: location.coords.speed || undefined,
              heading: location.coords.heading || undefined,
              timestamp: timestamp,
            };

            console.log(
              'Foreground location update:',
              userLocation.latitude,
              userLocation.longitude,
              `accuracy: ${userLocation.accuracy}m`,
            );
            onLocationUpdate(userLocation);
          } catch (error) {
            this.consecutiveErrors++;
            console.error(
              `Foreground location processing error (${this.consecutiveErrors}):`,
              error,
            );
            onError?.(`Location processing error: ${error}`);
          }
        },
      );

      console.log('Foreground location tracking started successfully');
      return true;
    } catch (error) {
      this.consecutiveErrors++;
      console.error('Error starting foreground location tracking:', error);
      onError?.('Failed to start location tracking');
      return false;
    }
  }

  /**
   * Stop location tracking
   */
  async stopLocationTracking(): Promise<void> {
    if (this.currentLocationSubscription) {
      this.currentLocationSubscription.remove();
      this.currentLocationSubscription = null;
      console.log('Foreground location tracking stopped');
    }
    this.isTrackingActive = false;
  }

  /**
   * Request background location permissions
   */
  async requestBackgroundPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
      };
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Check background location permission status
   */
  async checkBackgroundPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getBackgroundPermissionsAsync();

      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
      };
    } catch (error) {
      console.error('Error checking background location permission:', error);
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Start comprehensive tracking (foreground + background) with enhanced coordination
   */
  async startRunTracking(
    onLocationUpdate: (location: UserLocation) => void,
    onError?: (error: string) => void,
  ): Promise<boolean> {
    try {
      console.log('Starting comprehensive run tracking (foreground + background)');

      // Ensure no duplicate watchers by stopping any existing ones first
      await this.stopLocationTracking();
      await backgroundTaskService.stopBackgroundLocationTracking();

      // Small delay to ensure cleanup is complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start background tracking first for seamless transitions
      const backgroundStarted = await backgroundTaskService.startBackgroundLocationTracking();
      if (!backgroundStarted) {
        console.warn('Background tracking failed to start');
        onError?.('Background tracking not available - check permissions');
      }

      // Start foreground tracking for real-time UI updates
      const foregroundStarted = await this.startLocationTracking(onLocationUpdate, onError);
      if (!foregroundStarted) {
        console.error('Foreground tracking failed to start');
        await backgroundTaskService.stopBackgroundLocationTracking();
        return false;
      }

      console.log(
        'Run tracking started successfully - foreground:',
        foregroundStarted,
        'background:',
        backgroundStarted,
      );

      return true;
    } catch (error) {
      console.error('Error starting comprehensive run tracking:', error);
      onError?.('Failed to start comprehensive run tracking');
      return false;
    }
  }

  /**
   * Start monitoring GPS status with enhanced frequency
   */
  async startGPSMonitoring(
    onGPSDisabled: () => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    // Stop any existing monitoring
    this.stopGPSMonitoring();

    console.log('Starting GPS status monitoring');

    this.gpsMonitoringInterval = setInterval(async () => {
      try {
        const isEnabled = await this.isLocationServicesEnabled();
        if (!isEnabled) {
          console.log('GPS services disabled, triggering callback');
          onGPSDisabled();
        }
      } catch (error) {
        console.error('Error monitoring GPS status:', error);
        onError?.('Error monitoring GPS status');
      }
    }, 500); // Check every 500ms for responsive detection
  }

  /**
   * Stop GPS monitoring
   */
  stopGPSMonitoring(): void {
    if (this.gpsMonitoringInterval) {
      clearInterval(this.gpsMonitoringInterval);
      this.gpsMonitoringInterval = null;
      console.log('GPS monitoring stopped');
    }
  }

  /**
   * Stop comprehensive tracking (foreground + background) with enhanced cleanup
   */
  async stopRunTracking(): Promise<void> {
    try {
      console.log('Stopping comprehensive run tracking');

      // Stop foreground tracking
      await this.stopLocationTracking();

      // Stop background tracking
      await backgroundTaskService.stopBackgroundLocationTracking();

      // Stop GPS monitoring
      this.stopGPSMonitoring();

      // Reset tracking state
      this.lastLocationTime = 0;
      this.consecutiveErrors = 0;
      this.isTrackingActive = false;

      console.log('Comprehensive run tracking stopped');
    } catch (error) {
      console.error('Error stopping run tracking:', error);
    }
  }

  /**
   * Check if we have all necessary permissions for run tracking
   */
  async hasRunTrackingPermissions(): Promise<boolean> {
    const foregroundPermission = await this.checkLocationPermission();
    const backgroundPermission = await this.checkBackgroundPermission();

    return foregroundPermission.granted && backgroundPermission.granted;
  }

  /**
   * Request all necessary permissions for run tracking with enhanced flow
   */
  async requestRunTrackingPermissions(): Promise<boolean> {
    try {
      console.log('Requesting comprehensive run tracking permissions');

      // Request foreground permission first
      const foregroundPermission = await this.requestLocationPermission();
      if (!foregroundPermission.granted) {
        console.error('Foreground location permission denied');
        return false;
      }

      // Then request background permission
      const backgroundPermission = await this.requestBackgroundPermission();
      if (!backgroundPermission.granted) {
        console.warn('Background location permission denied');
        return false;
      }

      console.log('All run tracking permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting run tracking permissions:', error);
      return false;
    }
  }

  /**
   * Get current tracking status and statistics
   */
  getTrackingStatus(): {
    isActive: boolean;
    lastLocationTime: number;
    consecutiveErrors: number;
    hasActiveSubscription: boolean;
  } {
    return {
      isActive: this.isTrackingActive,
      lastLocationTime: this.lastLocationTime,
      consecutiveErrors: this.consecutiveErrors,
      hasActiveSubscription: this.currentLocationSubscription !== null,
    };
  }

  /**
   * Reset tracking state (useful for debugging)
   */
  resetTrackingState(): void {
    this.lastLocationTime = 0;
    this.consecutiveErrors = 0;
    this.isTrackingActive = false;
    console.log('Location service tracking state reset');
  }
}

export const locationService = new LocationService();
