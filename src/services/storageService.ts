import { Q } from '@nozbe/watermelondb';
import {
  database,
  Run as RunModel,
  RouteCoordinate as RouteCoordinateModel,
  CurrentTracking as CurrentTrackingModel,
  AppSetting as AppSettingModel,
} from '../db';
import { Run, RouteCoordinate, RouteSegment } from '../types/run';
import { WeeklyStreakData } from '../types/streak';
import { coordinatesToSegments, calculateDistance } from '../utils/metrics';

// Fallback storage for development when WatermelonDB is not available
let fallbackStorage: {
  runs: Run[];
  currentTracking: any;
  appSettings: Record<string, string>;
} = {
  runs: [],
  currentTracking: null,
  appSettings: {},
};

// Helper function to calculate weekly streak from run dates
const calculateStreakFromRuns = (runDates: number[]): WeeklyStreakData => {
  if (runDates.length === 0) {
    return { count: 0, isAtRisk: false, lastRunDate: '', needsThisWeekRun: true };
  }

  // Get current week start (Monday)
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  currentWeekStart.setHours(0, 0, 0, 0);

  // Get previous week start
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  // Group runs by week
  const weeklyRuns = new Map<string, number[]>();
  runDates.forEach((timestamp) => {
    const date = new Date(timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyRuns.has(weekKey)) {
      weeklyRuns.set(weekKey, []);
    }
    weeklyRuns.get(weekKey)!.push(timestamp);
  });

  // Check current and previous week
  const currentWeekKey = currentWeekStart.toISOString().split('T')[0];
  const prevWeekKey = prevWeekStart.toISOString().split('T')[0];
  const hasCurrentWeekRuns =
    weeklyRuns.has(currentWeekKey) && weeklyRuns.get(currentWeekKey)!.length > 0;
  const hasPrevWeekRuns = weeklyRuns.has(prevWeekKey) && weeklyRuns.get(prevWeekKey)!.length > 0;

  // Calculate consecutive weeks with runs
  let streak = 0;
  let weekToCheck = new Date(currentWeekStart);
  let lastRunDate = '';

  // Find the most recent run date
  if (runDates.length > 0) {
    const sortedDates = runDates.sort((a, b) => b - a);
    lastRunDate = new Date(sortedDates[0]).toISOString().split('T')[0];
  }

  while (true) {
    const weekString = weekToCheck.toISOString().split('T')[0];
    if (weeklyRuns.has(weekString) && weeklyRuns.get(weekString)!.length > 0) {
      streak++;
      weekToCheck.setDate(weekToCheck.getDate() - 7);
    } else {
      break;
    }
  }

  // Check if streak is "on the line"
  const isAtRisk = hasPrevWeekRuns && !hasCurrentWeekRuns;

  return {
    count: streak,
    isAtRisk,
    lastRunDate,
    needsThisWeekRun: !hasCurrentWeekRuns,
  };
};

// Check if WatermelonDB is available
const isWatermelonAvailable = (): boolean => {
  try {
    // Try to access the database adapter
    if (database && database.adapter) {
      return true;
    }
    return false;
  } catch (error) {
    console.warn('WatermelonDB not available, using fallback storage:', error);
    return false;
  }
};

export const storageService = {
  /**
   * Save a new run to storage
   */
  saveRun: async (run: Run): Promise<void> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      const existingIndex = fallbackStorage.runs.findIndex((r) => r.id === run.id);
      if (existingIndex >= 0) {
        fallbackStorage.runs[existingIndex] = run;
      } else {
        fallbackStorage.runs.push(run);
      }
      return;
    }

    try {
      await database.write(async () => {
        // Create the run record
        const runRecord = await database.get<RunModel>('runs').create((record) => {
          record.date = run.date;
          record.distance = run.distance;
          record.duration = run.duration;
          record.calories = run.calories;
          record.name = run.name || '';
          record._raw.id = run.id;
        });

        // Create route coordinate records from segments
        const routePromises: Promise<any>[] = [];
        let overallIndex = 0;

        for (const segment of run.segments) {
          for (const coordinate of segment.coordinates) {
            routePromises.push(
              database.get<RouteCoordinateModel>('route_coordinates').create((record) => {
                record.runId = run.id;
                record.latitude = coordinate.latitude;
                record.longitude = coordinate.longitude;
                record.accuracy = coordinate.accuracy;
                record.altitude = coordinate.altitude;
                record.timestamp = coordinate.timestamp;
                record.source = coordinate.source;
                record.orderIndex = overallIndex;
                record.segmentIndex = segment.segmentIndex;
                overallIndex++;
              }),
            );
          }
        }

        await Promise.all(routePromises);
      });
    } catch (error) {
      console.error('Error saving run:', error);
      throw new Error('Failed to save run');
    }
  },

  /**
   * Update the name of a run
   */
  updateRunName: async (id: string, newName: string): Promise<void> => {
    if (!isWatermelonAvailable()) {
      const run = fallbackStorage.runs.find((r) => r.id === id);
      if (run) run.name = newName;
      return;
    }
    await database.write(async () => {
      const runRecord = await database.get<RunModel>('runs').find(id);
      await runRecord.update(() => {
        runRecord.name = newName;
      });
    });
  },

  /**
   * Get all runs from storage
   */
  getAllRuns: async (): Promise<Run[]> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      return [...fallbackStorage.runs]
        .sort((a, b) => b.date - a.date)
        .map((run) => ({ ...run, route: [], segments: [] })); // Don't include route/segments for summary
    }

    try {
      const runRecords = await database
        .get<RunModel>('runs')
        .query(Q.sortBy('date', Q.desc))
        .fetch();

      const runs: Run[] = [];
      for (const record of runRecords) {
        runs.push({
          id: record.id,
          date: record.date,
          distance: record.distance,
          duration: record.duration,
          calories: record.calories,
          name: record.name,
          route: [], // Don't load route for summary - optimization
          segments: [], // Don't load segments for summary - optimization
        });
      }

      return runs;
    } catch (error) {
      console.error('Error getting all runs:', error);
      return [];
    }
  },

  /**
   * Get a specific run by ID
   */
  getRunById: async (id: string): Promise<Run | null> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      return fallbackStorage.runs.find((run) => run.id === id) || null;
    }

    try {
      const runRecord = await database.get<RunModel>('runs').find(id);

      if (!runRecord) {
        return null;
      }

      // Get route coordinates for this run
      const routeRecords = await database
        .get<RouteCoordinateModel>('route_coordinates')
        .query(Q.where('run_id', id), Q.sortBy('order_index', Q.asc))
        .fetch();

      const route: RouteCoordinate[] = routeRecords.map((record) => ({
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy: record.accuracy,
        altitude: record.altitude,
        timestamp: record.timestamp,
        source: record.source as 'foreground' | 'background' | undefined,
        segmentIndex: record.segmentIndex,
      }));

      // Build segments from route coordinates with enhanced metrics
      const segmentMap = new Map<
        number,
        {
          coordinates: RouteCoordinate[];
          distance: number;
          duration: number;
          startTime: number;
          endTime: number;
        }
      >();

      // First pass: group coordinates by segment
      for (const coord of route) {
        const segmentIndex = coord.segmentIndex || 0;
        if (!segmentMap.has(segmentIndex)) {
          segmentMap.set(segmentIndex, {
            coordinates: [],
            distance: 0,
            duration: 0,
            startTime: coord.timestamp || 0,
            endTime: coord.timestamp || 0,
          });
        }
        const segment = segmentMap.get(segmentIndex)!;
        segment.coordinates.push(coord);

        // Update start/end times
        if (coord.timestamp) {
          if (segment.startTime === 0 || coord.timestamp < segment.startTime) {
            segment.startTime = coord.timestamp;
          }
          if (coord.timestamp > segment.endTime) {
            segment.endTime = coord.timestamp;
          }
        }
      }

      // Second pass: calculate metrics for each segment
      const segments: RouteSegment[] = [];
      for (const [index, segmentData] of segmentMap.entries()) {
        let distance = 0;
        for (let i = 1; i < segmentData.coordinates.length; i++) {
          const prev = segmentData.coordinates[i - 1];
          const curr = segmentData.coordinates[i];
          distance += calculateDistance(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude,
          );
        }

        const duration = Math.floor((segmentData.endTime - segmentData.startTime) / 1000);

        segments.push({
          segmentIndex: index,
          coordinates: segmentData.coordinates,
          distance,
          duration,
          startTime: segmentData.startTime,
          endTime: segmentData.endTime,
        });
      }

      segments.sort((a, b) => a.segmentIndex - b.segmentIndex);

      return {
        id: runRecord.id,
        date: runRecord.date,
        distance: runRecord.distance,
        duration: runRecord.duration,
        calories: runRecord.calories,
        name: runRecord.name,
        route,
        segments,
      };
    } catch (error) {
      console.error(`Error getting run ${id}:`, error);
      return null;
    }
  },

  /**
   * Delete a run by ID
   */
  deleteRun: async (id: string): Promise<void> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      fallbackStorage.runs = fallbackStorage.runs.filter((r) => r.id !== id);
      return;
    }

    try {
      await database.write(async () => {
        // Delete route coordinates first
        const routeRecords = await database
          .get<RouteCoordinateModel>('route_coordinates')
          .query(Q.where('run_id', id))
          .fetch();

        await Promise.all(routeRecords.map((record) => record.destroyPermanently()));

        // Delete the run record
        const runRecord = await database.get<RunModel>('runs').find(id);
        if (runRecord) {
          await runRecord.destroyPermanently();
        }
      });
    } catch (error) {
      console.error(`Error deleting run ${id}:`, error);
      throw new Error('Failed to delete run');
    }
  },

  /**
   * Save current tracking data (for persistence during tracking)
   */
  saveCurrentTrackingData: async (data: {
    id: string;
    startTime: number;
    route: RouteCoordinate[];
    isTracking: boolean;
    isPaused: boolean;
    currentSegmentIndex?: number;
    totalPausedTime?: number;
    pauseStartTime?: number | null;
    currentSegmentStartTime?: number | null;
    elapsedTime?: number;
    segments?: RouteSegment[];
  }): Promise<void> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      fallbackStorage.currentTracking = data;
      return;
    }

    try {
      await database.write(async () => {
        // Check if current tracking record exists
        const existingRecords = await database
          .get<CurrentTrackingModel>('current_tracking')
          .query()
          .fetch();

        // Delete existing records (should only be one)
        await Promise.all(existingRecords.map((record) => record.destroyPermanently()));

        // Create new tracking record
        await database.get<CurrentTrackingModel>('current_tracking').create((record) => {
          record.runId = data.id;
          record.startTime = data.startTime;
          record.isTracking = data.isTracking;
          record.isPaused = data.isPaused;
          record.totalPausedTime = data.totalPausedTime || 0;
          record.pauseStartTime = data.pauseStartTime || 0;
          record.currentSegmentIndex = data.currentSegmentIndex || 0;
          record.currentSegmentStartTime = data.currentSegmentStartTime || data.startTime;
          record.elapsedTime = data.elapsedTime || 0;
        });

        // Save route data as temporary coordinates (will overwrite existing)
        // Delete existing temp route for this run
        const existingRouteRecords = await database
          .get<RouteCoordinateModel>('route_coordinates')
          .query(Q.where('run_id', data.id))
          .fetch();

        await Promise.all(existingRouteRecords.map((record) => record.destroyPermanently()));

        // Save current route
        const routePromises: Promise<any>[] = [];
        data.route.forEach((coordinate, index) => {
          routePromises.push(
            database.get<RouteCoordinateModel>('route_coordinates').create((record) => {
              record.runId = data.id;
              record.latitude = coordinate.latitude;
              record.longitude = coordinate.longitude;
              record.accuracy = coordinate.accuracy;
              record.altitude = coordinate.altitude;
              record.timestamp = coordinate.timestamp;
              record.source = coordinate.source;
              record.orderIndex = index;
              record.segmentIndex = coordinate.segmentIndex || 0;
            }),
          );
        });

        await Promise.all(routePromises);
      });
    } catch (error) {
      console.error('Error saving current tracking data:', error);
    }
  },

  /**
   * Get current tracking data
   */
  getCurrentTrackingData: async (): Promise<any | null> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      return fallbackStorage.currentTracking;
    }

    try {
      const trackingRecords = await database
        .get<CurrentTrackingModel>('current_tracking')
        .query()
        .fetch();

      if (trackingRecords.length === 0) {
        return null;
      }

      const record = trackingRecords[0];

      // Get route data if the run exists
      let route: RouteCoordinate[] = [];
      try {
        const routeRecords = await database
          .get<RouteCoordinateModel>('route_coordinates')
          .query(Q.where('run_id', record.runId), Q.sortBy('order_index', Q.asc))
          .fetch();

        route = routeRecords.map((routeRecord) => ({
          latitude: routeRecord.latitude,
          longitude: routeRecord.longitude,
          accuracy: routeRecord.accuracy,
          altitude: routeRecord.altitude,
          timestamp: routeRecord.timestamp,
          source: routeRecord.source as 'foreground' | 'background' | undefined,
          segmentIndex: routeRecord.segmentIndex,
        }));
      } catch (err) {
        console.warn('Could not load route for current tracking:', err);
      }

      return {
        id: record.runId,
        startTime: record.startTime,
        route,
        isTracking: record.isTracking,
        isPaused: record.isPaused,
        currentSegmentIndex:
          record.currentSegmentIndex || Math.max(...route.map((r) => r.segmentIndex || 0), 0),
        totalPausedTime: record.totalPausedTime || 0,
        pauseStartTime: record.pauseStartTime > 0 ? record.pauseStartTime : null,
        currentSegmentStartTime: record.currentSegmentStartTime || record.startTime,
        elapsedTime: record.elapsedTime || 0,
      };
    } catch (error) {
      console.error('Error getting current tracking data:', error);
      return null;
    }
  },

  /**
   * Clear current tracking data
   */
  clearCurrentTrackingData: async (): Promise<void> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      fallbackStorage.currentTracking = null;
      return;
    }

    try {
      await database.write(async () => {
        const trackingRecords = await database
          .get<CurrentTrackingModel>('current_tracking')
          .query()
          .fetch();
        await Promise.all(trackingRecords.map((record) => record.destroyPermanently()));
      });
    } catch (error) {
      console.error('Error clearing current tracking data:', error);
    }
  },

  /**
   * Clear all data (for development/testing purposes)
   */
  clearAllData: async (): Promise<void> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      fallbackStorage.runs = [];
      fallbackStorage.currentTracking = null;
      return;
    }

    try {
      await database.write(async () => {
        // Clear all tables
        const runRecords = await database.get<RunModel>('runs').query().fetch();
        const routeRecords = await database
          .get<RouteCoordinateModel>('route_coordinates')
          .query()
          .fetch();
        const trackingRecords = await database
          .get<CurrentTrackingModel>('current_tracking')
          .query()
          .fetch();

        await Promise.all([
          ...runRecords.map((record) => record.destroyPermanently()),
          ...routeRecords.map((record) => record.destroyPermanently()),
          ...trackingRecords.map((record) => record.destroyPermanently()),
        ]);
      });
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  },

  /**
   * Get an app setting value by key
   */
  getAppSetting: async (key: string): Promise<string | null> => {
    if (!isWatermelonAvailable()) {
      return fallbackStorage.appSettings[key] || null;
    }

    try {
      const settingRecords = await database
        .get<AppSettingModel>('app_settings')
        .query(Q.where('key', key))
        .fetch();

      return settingRecords.length > 0 ? settingRecords[0].value : null;
    } catch (error) {
      console.error(`Error getting app setting ${key}:`, error);
      return null;
    }
  },

  /**
   * Set an app setting value by key
   */
  setAppSetting: async (key: string, value: string): Promise<void> => {
    if (!isWatermelonAvailable()) {
      fallbackStorage.appSettings[key] = value;
      return;
    }

    try {
      await database.write(async () => {
        // Check if setting already exists
        const existingRecords = await database
          .get<AppSettingModel>('app_settings')
          .query(Q.where('key', key))
          .fetch();

        if (existingRecords.length > 0) {
          // Update existing setting
          await existingRecords[0].update((record) => {
            record.value = value;
          });
        } else {
          // Create new setting
          await database.get<AppSettingModel>('app_settings').create((record) => {
            record.key = key;
            record.value = value;
          });
        }
      });
    } catch (error) {
      console.error(`Error setting app setting ${key}:`, error);
      throw new Error('Failed to save app setting');
    }
  },

  /**
   * Check if the user has already seen the background notification
   */
  hasSeenBackgroundNotification: async (): Promise<boolean> => {
    const value = await storageService.getAppSetting('background_notification_shown');
    return value === 'true';
  },

  /**
   * Mark that the user has seen the background notification
   */
  markBackgroundNotificationShown: async (): Promise<void> => {
    await storageService.setAppSetting('background_notification_shown', 'true');
  },

  /**
   * Get runs for a specific date (YYYY-MM-DD format)
   */
  getRunsForDate: async (dateString: string): Promise<Run[]> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation - use local time zone
      const [year, month, day] = dateString.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

      return fallbackStorage.runs.filter((run) => {
        return run.date >= startOfDay && run.date <= endOfDay;
      });
    }

    try {
      // Use local time zone boundaries instead of UTC
      const [year, month, day] = dateString.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

      const runRecords = await database
        .get<RunModel>('runs')
        .query(
          Q.where('date', Q.gte(startOfDay)),
          Q.where('date', Q.lte(endOfDay)),
          Q.sortBy('date', Q.desc),
        )
        .fetch();

      const runs: Run[] = [];
      for (const record of runRecords) {
        runs.push({
          id: record.id,
          date: record.date,
          distance: record.distance,
          duration: record.duration,
          calories: record.calories,
          name: record.name,
          route: [], // Don't load route for summary
          segments: [], // Don't load segments for summary
        });
      }

      return runs;
    } catch (error) {
      console.error('Error getting runs for date:', error);
      return [];
    }
  },

  /**
   * Get unique dates that have runs (for calendar highlighting)
   */
  getDatesWithRuns: async (): Promise<string[]> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation - use local time zone
      const dates = new Set<string>();
      fallbackStorage.runs.forEach((run) => {
        const date = new Date(run.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        dates.add(dateString);
      });
      return Array.from(dates);
    }

    try {
      const runRecords = await database.get<RunModel>('runs').query().fetch();

      const dates = new Set<string>();
      runRecords.forEach((record) => {
        const date = new Date(record.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        dates.add(dateString);
      });

      return Array.from(dates);
    } catch (error) {
      console.error('Error getting dates with runs:', error);
      return [];
    }
  },

  /**
   * Calculate weekly streak (consecutive weeks with at least one run)
   */
  calculateWeeklyStreak: async (): Promise<WeeklyStreakData> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      return calculateStreakFromRuns(fallbackStorage.runs.map((r) => r.date));
    }

    try {
      const runRecords = await database
        .get<RunModel>('runs')
        .query(Q.sortBy('date', Q.desc))
        .fetch();

      const runDates = runRecords.map((record) => record.date);
      return calculateStreakFromRuns(runDates);
    } catch (error) {
      console.error('Error calculating weekly streak:', error);
      return { count: 0, isAtRisk: false, lastRunDate: '', needsThisWeekRun: true };
    }
  },

  /**
   * Get all runs with their complete route data for export
   */
  getAllRunsWithRoutes: async (): Promise<Run[]> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      return [...fallbackStorage.runs];
    }

    try {
      const runRecords = await database
        .get<RunModel>('runs')
        .query(Q.sortBy('date', Q.desc))
        .fetch();

      const runs: Run[] = [];
      for (const record of runRecords) {
        // Get route coordinates for this run
        const routeRecords = await database
          .get<RouteCoordinateModel>('route_coordinates')
          .query(Q.where('run_id', record.id), Q.sortBy('order_index', Q.asc))
          .fetch();

        const route: RouteCoordinate[] = routeRecords.map((routeRecord) => ({
          latitude: routeRecord.latitude,
          longitude: routeRecord.longitude,
          accuracy: routeRecord.accuracy,
          altitude: routeRecord.altitude,
          timestamp: routeRecord.timestamp,
          source: routeRecord.source as 'foreground' | 'background' | undefined,
          segmentIndex: routeRecord.segmentIndex,
        }));

        // Convert route to segments
        const segments = coordinatesToSegments(route);

        runs.push({
          id: record.id,
          date: record.date,
          distance: record.distance,
          duration: record.duration,
          calories: record.calories,
          name: record.name,
          route,
          segments,
        });
      }

      return runs;
    } catch (error) {
      console.error('Error getting all runs with routes:', error);
      return [];
    }
  },

  /**
   * Delete all runs and their route data
   */
  deleteAllRuns: async (): Promise<void> => {
    if (!isWatermelonAvailable()) {
      // Fallback implementation
      fallbackStorage.runs = [];
      return;
    }

    try {
      await database.write(async () => {
        // Delete all route coordinates
        const routeRecords = await database
          .get<RouteCoordinateModel>('route_coordinates')
          .query()
          .fetch();
        await Promise.all(routeRecords.map((record) => record.destroyPermanently()));

        // Delete all runs
        const runRecords = await database.get<RunModel>('runs').query().fetch();
        await Promise.all(runRecords.map((record) => record.destroyPermanently()));
      });
    } catch (error) {
      console.error('Error deleting all runs:', error);
      throw new Error('Failed to delete all runs');
    }
  },

  /**
   * Import runs from external data
   */
  importRuns: async (runs: Run[]): Promise<void> => {
    // Defensive check – ignore empty payloads
    if (!runs || runs.length === 0) {
      return;
    }

    if (!isWatermelonAvailable()) {
      // Fallback implementation – avoid pushing duplicates
      const existingIds = new Set(fallbackStorage.runs.map((r) => r.id));
      const newRuns = runs.filter((r) => !existingIds.has(r.id));
      fallbackStorage.runs.push(...newRuns);
      return;
    }

    try {
      // Load all existing run ids once to avoid repeated DB calls
      const existingRunRecords = await database.get<RunModel>('runs').query().fetch();
      const existingIds = new Set(existingRunRecords.map((rec) => rec.id));

      for (const originalRun of runs) {
        let runToSave = { ...originalRun };

        // If a run with the same id already exists, generate a new unique id to avoid PK clash
        if (existingIds.has(originalRun.id)) {
          let newId: string;
          let attempt = 0;
          do {
            newId = `${originalRun.id}-${Date.now()}-${attempt}`;
            attempt++;
          } while (existingIds.has(newId));

          runToSave = {
            ...originalRun,
            id: newId,
            // segments/route objects don't carry the runId so we can pass them through untouched
          };
        }

        await storageService.saveRun(runToSave);

        // Track newly added id to avoid future collisions within this import batch
        existingIds.add(runToSave.id);
      }
    } catch (error) {
      console.error('Error importing runs:', error);
      throw new Error('Failed to import runs');
    }
  },
};
