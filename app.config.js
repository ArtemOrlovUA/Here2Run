import 'dotenv/config';

export default {
  expo: {
    name: 'Here2Run',
    slug: 'here2run',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ['location', 'background-fetch', 'background-processing'],
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'This app uses location to track your running routes continuously, even when the app is in the background.',
        NSLocationWhenInUseUsageDescription: 'This app uses location to track your running routes.',
        NSLocationAlwaysUsageDescription:
          'This app uses location to track your running routes in the background.',
        BGTaskSchedulerPermittedIdentifiers: ['background-location-task'],
      },
    },
    android: {
      userInterfaceStyle: 'light',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'WAKE_LOCK',
        'REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        'VIBRATE',
        'POST_NOTIFICATIONS',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.WAKE_LOCK',
        'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        'android.permission.VIBRATE',
        'android.permission.POST_NOTIFICATIONS',
      ],
      package: 'com.artemorlov.here2run',
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_DEFAULT_API_KEY_HERE',
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'This app uses location to track your running routes continuously, even when the app is in the background.',
          locationAlwaysPermission:
            'This app uses location to track your running routes in the background for accurate GPS tracking.',
          locationWhenInUsePermission: 'This app uses location to track your running routes.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-task-manager',
        {
          enableBackgroundProcessing: true,
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '93c88b88-1e45-4504-a194-b16aa737b135',
      },
    },
  },
};
