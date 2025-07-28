import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { RouteCoordinate } from '../types/run';
import { UserLocation } from '../services/locationService';
import { coordinatesToSegments } from '../utils/metrics';

const { height } = Dimensions.get('window');

interface TrackingMapProps {
  route: RouteCoordinate[];
  userLocation: UserLocation | null;
  isTracking: boolean;
  isPaused: boolean;
  mapType: 'standard' | 'satellite';
  onMapTypeToggle: () => void;
  mapRef: React.RefObject<MapView>;
  mapTrackingMode: 'follow' | 'manual';
  onUserInteraction: () => void;
  onCenterMap: () => void;
}

export default function TrackingMap({
  route,
  userLocation,
  isTracking,
  isPaused,
  mapType,
  onMapTypeToggle,
  mapRef,
  mapTrackingMode,
  onUserInteraction,
  onCenterMap,
}: TrackingMapProps): React.JSX.Element {
  const defaultRegion = {
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Determine the best map region based on current context
  const getMapRegion = () => {
    if (route.length > 1 && isTracking) {
      // If we have a route, fit to show the entire route
      const latitudes = route.map((point) => point.latitude);
      const longitudes = route.map((point) => point.longitude);

      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const latDelta = Math.max((maxLat - minLat) * 1.2, 0.01);
      const lngDelta = Math.max((maxLng - minLng) * 1.2, 0.01);

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    } else if (userLocation) {
      // If we have user location but no route, center on user
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    return defaultRegion;
  };

  const mapRegion = getMapRegion();

  return (
    <View style={{ height: height * 0.4 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        mapType={mapType}
        // Always disable built-in followsUserLocation to prevent conflicts with custom tracking mode logic
        followsUserLocation={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        pitchEnabled={false}
        rotateEnabled={false}
        onPanDrag={onUserInteraction}
        scrollEnabled={true}
        zoomEnabled={true}>
        {/* Route polylines - separated by segments */}
        {route.length > 1 &&
          coordinatesToSegments(route).map((segment) => {
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

      {/* Map Controls */}
      <View className="absolute right-3 top-3 flex-col items-center">
        <TouchableOpacity
          className="bg-white p-2 rounded-full shadow-md mb-3"
          activeOpacity={0.7}
          onPress={onMapTypeToggle}>
          <MaterialCommunityIcons
            name={mapType === 'standard' ? 'map' : 'satellite-variant'}
            size={24}
            color="#000000"
          />
        </TouchableOpacity>

        {mapTrackingMode === 'manual' && isTracking && (
          <TouchableOpacity
            className="bg-white p-2 rounded-full shadow-md"
            activeOpacity={0.7}
            onPress={onCenterMap}>
            <MaterialIcons name="my-location" size={24} color="#000000" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
