import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MetricCard from './MetricCard';

interface TrackingMetricsProps {
  distance: string;
  duration: string;
  pace: string;
  calories: string;
}

export default function TrackingMetrics({
  distance,
  duration,
  pace,
  calories,
}: TrackingMetricsProps): React.JSX.Element {
  return (
    <View className="px-4 py-6">
      <View className="gap-y-4">
        <View className="flex-row gap-x-4">
          <View className="flex-1">
            <MetricCard
              title="Distance"
              value={distance}
              unit="km"
              icon={<Ionicons name="footsteps" size={20} color="#3b82f6" />}
            />
          </View>
          <View className="flex-1">
            <MetricCard
              title="Duration"
              value={duration}
              icon={<Ionicons name="time" size={20} color="#3b82f6" />}
            />
          </View>
        </View>
        <View className="flex-row gap-x-4">
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
              value={calories}
              unit="kcal"
              icon={<Ionicons name="flame" size={20} color="#3b82f6" />}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
