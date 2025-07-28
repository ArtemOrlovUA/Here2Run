import { LocationObjectCoords } from 'expo-location';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  altitudeAccuracy?: number;
  heading?: number;
  timestamp?: number;
  source?: 'foreground' | 'background';
  segmentIndex?: number; // New field to track which segment this coordinate belongs to
}

export interface RouteSegment {
  segmentIndex: number;
  coordinates: RouteCoordinate[];
  distance: number; // Distance in meters for this segment
  duration: number; // Duration in seconds for this segment
  startTime: number; // Timestamp when segment started
  endTime: number; // Timestamp when segment ended
}

export interface Run {
  id: string;
  date: number; // Unix timestamp of the run's start time
  distance: number; // total distance in meters
  duration: number; // total duration in seconds
  calories: number; // estimated calories burned
  route: RouteCoordinate[]; // Keep for backward compatibility
  segments: RouteSegment[]; // New field for multiple route segments
  name?: string;
}

export interface RunSummary {
  id: string;
  date: number;
  distance: number;
  duration: number;
  name?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
}
