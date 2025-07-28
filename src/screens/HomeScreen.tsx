import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StatusBar, RefreshControl } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RunSummary, Run } from '../types/run';
import RunCard from '../components/RunCard';
import { storageService } from '../services/storageService';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { theme } = useTheme();
  const styles = getThemedStyles();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load runs when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      loadRuns();
    }
  }, [isFocused]);

  const loadRuns = async (): Promise<void> => {
    try {
      const runsFromStorage = await storageService.getAllRuns();
      // Convert Run[] to RunSummary[] by excluding the route data
      const runSummaries: RunSummary[] = runsFromStorage.map((run: Run) => ({
        id: run.id,
        date: run.date,
        distance: run.distance,
        duration: run.duration,
        name: run.name,
      }));
      setRuns(runSummaries);
    } catch (error) {
      console.error('Error loading runs:', error);
      setRuns([]); // Set empty array on error
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadRuns();
    setRefreshing(false);
  };

  const handleRunPress = (runId: string): void => {
    // @ts-ignore - Navigation typing will be fixed when service layer is implemented
    navigation.navigate('RunDetail', { runId });
  };

  const renderEmptyState = (): React.JSX.Element => (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className={`w-20 h-20 ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
        } rounded-full items-center justify-center mb-4`}>
        <Ionicons name="footsteps-outline" size={40} color={styles.iconColorSecondary} />
      </View>
      <Text className={`text-xl font-semibold ${styles.textPrimary} mb-2`}>No runs yet</Text>
      <Text className={`text-center ${styles.textSecondary} leading-6`}>
        Start your first run by tapping the Track tab and begin your fitness journey!
      </Text>
    </View>
  );

  const renderRunItem = ({ item }: { item: RunSummary }): React.JSX.Element => (
    <RunCard run={item} onPress={() => handleRunPress(item.id)} />
  );

  const getTotalStats = () => {
    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    const totalSeconds = runs.reduce((sum, run) => sum + run.duration, 0);
    const totalMinutes = totalSeconds / 60;
    const totalRuns = runs.length;
    let totalDurationValue;
    let durationUnit;
    if (totalMinutes >= 60) {
      totalDurationValue = (totalMinutes / 60).toFixed(1);
      durationUnit = 'hours';
    } else {
      totalDurationValue = Math.round(totalMinutes);
      durationUnit = 'min';
    }
    return {
      totalDistance: (totalDistance / 1000).toFixed(1),
      totalDuration: totalDurationValue,
      durationUnit,
      totalRuns,
    };
  };

  const stats = getTotalStats();
  const insets = useSafeAreaInsets();

  return (
    <View className={`flex-1 ${styles.backgroundColor}`} style={{ paddingTop: insets.top }}>
      <StatusBar
        barStyle={styles.statusBarStyle as any}
        backgroundColor={styles.statusBarBgColor}
      />

      {/* Header */}
      <View className={`${styles.cardBackground} border-b ${styles.borderColor} px-6 py-4`}>
        <Text className={`text-2xl font-bold ${styles.textPrimary} mb-1`}>Running History</Text>
        <Text className={`text-sm ${styles.textSecondary}`}>
          Track your progress and achievements
        </Text>
      </View>

      {runs.length > 0 && (
        /* Stats Overview */
        <View
          className={`${styles.cardBackground} mx-4 mt-4 rounded-xl p-4 shadow-sm border ${styles.borderColor}`}>
          <Text className={`text-lg font-semibold ${styles.textPrimary} mb-3`}>Your Stats</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">{stats.totalRuns}</Text>
              <Text className={`text-xs ${styles.textSecondary} mt-1`}>Runs</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">{stats.totalDistance}</Text>
              <Text className={`text-xs ${styles.textSecondary} mt-1`}>km</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">{stats.totalDuration}</Text>
              <Text className={`text-xs ${styles.textSecondary} mt-1`}>{stats.durationUnit}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Runs List */}
      <View className="flex-1 px-4 pt-4" style={{ paddingBottom: insets.bottom }}>
        <FlatList
          data={runs}
          renderItem={renderRunItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 20,
          }}
        />
      </View>
    </View>
  );
}
