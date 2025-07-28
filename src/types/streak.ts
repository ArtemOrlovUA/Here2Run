export interface WeeklyStreakData {
  count: number; // The current streak count
  isAtRisk: boolean; // Whether the streak is "on the line"
  lastRunDate: string; // ISO date string of the last run
  needsThisWeekRun: boolean; // Whether user needs a run in current week
}
