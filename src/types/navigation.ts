import type { NavigatorScreenParams } from '@react-navigation/native';
import { Run } from './run';

// Main Stack Navigator parameter list
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  RunDetail: {
    runId: string;
  };
  RunReview: {
    tempRun: Run;
  };
  Settings: undefined;
};

// Bottom Tab Navigator parameter list
export type MainTabParamList = {
  Dashboard: undefined;
  Track: undefined;
  History: undefined;
};

// Type definitions for navigation props
export type RootStackScreenProps<Screen extends keyof RootStackParamList> = {
  route: {
    params: RootStackParamList[Screen];
  };
  navigation: any;
};

export type MainTabScreenProps<Screen extends keyof MainTabParamList> = {
  route: {
    params: MainTabParamList[Screen];
  };
  navigation: any;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
