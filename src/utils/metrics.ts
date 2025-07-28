import { RouteSegment } from '../types/run';

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate total distance from multiple route segments
 * @param segments Array of route segments
 * @returns Total distance in meters
 */
export function calculateTotalDistanceFromSegments(segments: RouteSegment[]): number {
  let totalDistance = 0;

  for (const segment of segments) {
    totalDistance += calculateTotalDistance(segment.coordinates);
  }

  return totalDistance;
}

/**
 * Calculate total distance from an array of coordinates
 * @param coordinates Array of coordinate objects with latitude and longitude
 * @returns Total distance in meters
 */
export function calculateTotalDistance(
  coordinates: Array<{ latitude: number; longitude: number }>,
): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    totalDistance += calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );
  }

  return totalDistance;
}

/**
 * Convert a flat array of coordinates to segments based on their segmentIndex
 * @param coordinates Array of coordinates with segmentIndex and optional timestamp
 * @returns Array of route segments with calculated metrics
 */
export function coordinatesToSegments(
  coordinates: Array<{
    latitude: number;
    longitude: number;
    segmentIndex?: number;
    timestamp?: number;
  }>,
): RouteSegment[] {
  const segmentMap = new Map<
    number,
    Array<{ latitude: number; longitude: number; timestamp?: number }>
  >();

  for (const coord of coordinates) {
    const segmentIndex = coord.segmentIndex || 0;
    if (!segmentMap.has(segmentIndex)) {
      segmentMap.set(segmentIndex, []);
    }
    segmentMap.get(segmentIndex)!.push(coord);
  }

  const segments: RouteSegment[] = [];
  for (const [index, segmentCoords] of segmentMap.entries()) {
    // Calculate distance for this segment
    const distance = calculateTotalDistance(segmentCoords);

    // Calculate duration from timestamps if available
    let duration = 0;
    let startTime = 0;
    let endTime = 0;

    if (segmentCoords.length > 0) {
      const timestampedCoords = segmentCoords.filter((c) => c.timestamp);
      if (timestampedCoords.length > 0) {
        startTime = Math.min(...timestampedCoords.map((c) => c.timestamp!));
        endTime = Math.max(...timestampedCoords.map((c) => c.timestamp!));
        duration = Math.floor((endTime - startTime) / 1000);
      }
    }

    segments.push({
      segmentIndex: index,
      coordinates: segmentCoords,
      distance,
      duration,
      startTime,
      endTime,
    });
  }

  return segments.sort((a, b) => a.segmentIndex - b.segmentIndex);
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate and format pace (minutes per kilometer)
 * @param distanceMeters Distance in meters
 * @param durationSeconds Duration in seconds
 * @returns Formatted pace string (e.g., "5:30")
 */
export function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters === 0 || durationSeconds === 0) return '0:00';

  const minutesPerKm = durationSeconds / 60 / (distanceMeters / 1000);
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format distance in meters to kilometers with appropriate decimal places
 * @param meters Distance in meters
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted distance string
 */
export function formatDistance(meters: number, decimals: number = 2): string {
  const km = meters / 1000;
  return km.toFixed(decimals);
}

/**
 * Calculate calories burned based on distance and weight
 * @param distanceKm Distance in kilometers
 * @param weightKg Weight in kilograms (default: 70kg)
 * @returns Estimated calories burned
 */
export function calculateCalories(distanceKm: number, weightKg: number = 70): number {
  // Rough calculation: ~65 calories per km for average person
  const caloriesPerKm = 0.75 * weightKg; // More accurate formula
  return Math.round(distanceKm * caloriesPerKm);
}

export function getColorForPace(paceMinutes: number): string {
  if (paceMinutes >= 8) return '#ffd700'; // light orange
  if (paceMinutes >= 6) return '#ffa500'; // orange
  if (paceMinutes >= 5) return '#ffff00'; // yellow
  if (paceMinutes >= 4) return '#00ff00'; // green
  return '#ff0000'; // red
}

/**
 * Calculate segment metrics from coordinates and timing
 * @param coordinates Array of coordinates for the segment
 * @param startTime Segment start timestamp
 * @param endTime Segment end timestamp
 * @returns Segment with calculated metrics
 */
export function calculateSegmentMetrics(
  coordinates: Array<{ latitude: number; longitude: number }>,
  startTime: number,
  endTime: number,
  segmentIndex: number,
): RouteSegment {
  const distance = calculateTotalDistance(coordinates);
  const duration = Math.floor((endTime - startTime) / 1000);

  return {
    segmentIndex,
    coordinates,
    distance,
    duration,
    startTime,
    endTime,
  };
}

/**
 * Format pace for a specific segment
 * @param segment RouteSegment with distance and duration
 * @returns Formatted pace string
 */
export function formatSegmentPace(segment: RouteSegment): string {
  return formatPace(segment.distance, segment.duration);
}
