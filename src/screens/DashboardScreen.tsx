import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, StatusBar, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';

import { storageService } from '../services/storageService';
import { Run } from '../types/run';
import { WeeklyStreakData } from '../types/streak';
import { RootStackParamList } from '../types/navigation';
import StreakCard from '../components/StreakCard';
import RunCard from '../components/RunCard';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

type DashboardNavigationProp = NavigationProp<RootStackParamList>;

export default function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<DashboardNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = getThemedStyles();
  const [streakData, setStreakData] = useState<WeeklyStreakData>({
    count: 0,
    isAtRisk: false,
    lastRunDate: '',
    needsThisWeekRun: true,
  });
  const [datesWithRuns, setDatesWithRuns] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [runsForSelectedDate, setRunsForSelectedDate] = useState<Run[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [weeklyStreakData, runDates] = await Promise.all([
        storageService.calculateWeeklyStreak(),
        storageService.getDatesWithRuns(),
      ]);

      setStreakData(weeklyStreakData);
      setDatesWithRuns(runDates);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRunsForDate = useCallback(async (dateString: string) => {
    try {
      const runs = await storageService.getRunsForDate(dateString);
      setRunsForSelectedDate(runs);
    } catch (error) {
      console.error('Error loading runs for date:', error);
      setRunsForSelectedDate([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  const handleDayPress = (day: DateData) => {
    if (datesWithRuns.includes(day.dateString)) {
      setSelectedDate(day.dateString);
      loadRunsForDate(day.dateString);
    }
  };

  const handleMonthChange = (month: DateData) => {
    setCurrentMonth(month.dateString.slice(0, 7));
    setSelectedDate('');
    setRunsForSelectedDate([]);
  };

  const handleRunPress = (run: Run) => {
    navigation.navigate('RunDetail', { runId: run.id });
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  // Memoize calendar theme to ensure correct re-render on theme change
  const calendarTheme = React.useMemo(
    () => ({
      backgroundColor: 'transparent',
      calendarBackground: 'transparent',
      textSectionTitleColor: theme === 'dark' ? '#9ca3af' : '#6b7280',
      selectedDayBackgroundColor: '#3b82f6',
      selectedDayTextColor: '#ffffff',
      todayTextColor: '#3b82f6',
      dayTextColor: theme === 'dark' ? '#ffffff' : '#1f2937',
      textDisabledColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
      dotColor: '#3b82f6',
      selectedDotColor: '#ffffff',
      arrowColor: '#3b82f6',
      disabledArrowColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
      monthTextColor: theme === 'dark' ? '#ffffff' : '#1f2937',
      indicatorColor: '#3b82f6',
      textDayFontFamily: 'System',
      textMonthFontFamily: 'System',
      textDayHeaderFontFamily: 'System',
      textDayFontWeight: '400',
      textMonthFontWeight: '600',
      textDayHeaderFontWeight: '500',
      textDayFontSize: 16,
      textMonthFontSize: 18,
      textDayHeaderFontSize: 14,
    }),
    [theme],
  );

  // Create marked dates object for calendar
  const markedDates = React.useMemo(() => {
    const marked: Record<string, any> = {};

    datesWithRuns.forEach((date) => {
      marked[date] = {
        marked: true,
        dotColor: '#3b82f6',
        activeOpacity: 0.7,
      };
    });

    if (selectedDate && datesWithRuns.includes(selectedDate)) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#3b82f6',
        selectedTextColor: 'white',
      };
    }

    return marked;
  }, [datesWithRuns, selectedDate]);

  if (loading) {
    return (
      <View className={`flex-1 ${styles.backgroundColor} items-center justify-center`}>
        <Text className={styles.textSecondary}>Loading...</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${styles.backgroundColor}`} style={{ paddingTop: insets.top }}>
      <StatusBar
        barStyle={styles.statusBarStyle as any}
        backgroundColor={styles.statusBarBgColor}
      />

      {/* Header */}
      <View className={`${styles.cardBackground} border-b ${styles.borderColor} px-6 py-4`}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className={`text-2xl font-bold ${styles.textPrimary} mb-1`}>Dashboard</Text>
          </View>
          <TouchableOpacity
            onPress={handleSettingsPress}
            className={`flex-row items-center ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
            } px-3 py-2 rounded-lg`}>
            <Ionicons name="settings-outline" size={18} color={styles.iconColorSecondary} />
            <Text className={`text-sm font-medium ${styles.textSecondary} ml-2`}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Streak Section */}
          <StreakCard
            streak={streakData.count}
            isAtRisk={streakData.isAtRisk}
            needsThisWeekRun={streakData.needsThisWeekRun}
          />

          {/* Calendar Section */}
          <View
            className={`${styles.cardBackground} rounded-xl shadow-sm border ${styles.borderColor}`}>
            {/* Calendar */}
            <Calendar
              key={`calendar-${theme}`}
              current={currentMonth + '-01'}
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              hideExtraDays={true}
              enableSwipeMonths={true}
              theme={calendarTheme}
            />

            {/* Selected Date Runs */}
            {selectedDate && runsForSelectedDate.length > 0 && (
              <View className={`p-4 border-t ${styles.borderColor}`}>
                <Text className={`text-lg font-semibold ${styles.textPrimary} mb-3`}>
                  Runs on{' '}
                  {new Date(selectedDate + 'T00:00:00.000Z').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <FlatList
                  data={runsForSelectedDate}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <RunCard
                      run={{
                        id: item.id,
                        date: item.date,
                        distance: item.distance,
                        duration: item.duration,
                        name: item.name,
                      }}
                      onPress={() => handleRunPress(item)}
                    />
                  )}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
