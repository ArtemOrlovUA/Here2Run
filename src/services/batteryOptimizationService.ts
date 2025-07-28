import { Platform, Linking, Alert } from 'react-native';
import { storageService } from './storageService';

export interface BatteryOptimizationStatus {
  isOptimized: boolean;
  canRequestExemption: boolean;
  manufacturer: string;
  recommendations: string[];
}

class BatteryOptimizationService {
  private readonly MANUFACTURER_GUIDES = {
    samsung: [
      'Open Settings → Device care → Battery → App power management',
      'Add Here2Run to "Apps that won\'t be put to sleep"',
      'Turn off "Adaptive battery" or add Here2Run to exceptions',
      'Go to Settings → Apps → Here2Run → Battery → Allow background activity',
    ],
    huawei: [
      'Open Settings → Battery → App launch',
      'Find Here2Run and toggle "Manage manually"',
      'Enable "Auto-launch", "Secondary launch", and "Run in background"',
      'Go to Settings → Apps → Here2Run → Battery → ignore battery optimizations',
    ],
    xiaomi: [
      'Open Settings → Apps → Manage apps → Here2Run',
      'Enable "Autostart" and "Background activity"',
      "Go to Settings → Battery & performance → Manage app's battery usage",
      'Set Here2Run to "No restrictions"',
    ],
    oppo: [
      'Open Settings → Battery → Battery optimization',
      'Find Here2Run and select "Don\'t optimize"',
      'Go to Settings → Apps → Here2Run → Battery usage → Allow background activity',
      'Enable "Auto-launch" in Privacy permissions',
    ],
    vivo: [
      'Open Settings → Battery → Background app refresh',
      'Enable background refresh for Here2Run',
      'Go to Settings → Apps → Here2Run → Battery → High background power consumption',
      'Allow high background power consumption',
    ],
    oneplus: [
      'Open Settings → Battery → Battery optimization',
      'Find Here2Run and select "Don\'t optimize"',
      "Go to Settings → Apps → Here2Run → Battery optimization → Don't optimize",
      'Enable "Allow background activity"',
    ],
    default: [
      'Open Settings → Battery → Battery optimization',
      'Find Here2Run and select "Don\'t optimize"',
      'Go to Settings → Apps → Here2Run → Battery',
      'Allow background activity and disable battery optimization',
      "Keep the app running in recent apps (don't swipe it away)",
    ],
  };

  /**
   * Get device manufacturer information
   */
  private getManufacturer(): string {
    if (Platform.OS !== 'android') return 'unknown';

    // Note: React Native doesn't provide direct access to Build.MANUFACTURER
    // This would need to be implemented with a native module or expo-device
    // For now, we'll return 'unknown' and provide generic guidance
    return 'unknown';
  }

  /**
   * Check if the device likely has aggressive battery optimization
   */
  isAggressiveBatteryOptimizationDevice(): boolean {
    if (Platform.OS !== 'android') return false;

    const manufacturer = this.getManufacturer().toLowerCase();
    const aggressiveManufacturers = [
      'huawei',
      'honor',
      'xiaomi',
      'redmi',
      'oppo',
      'vivo',
      'oneplus',
      'realme',
    ];

    return aggressiveManufacturers.some((brand) => manufacturer.includes(brand));
  }

  /**
   * Get battery optimization recommendations based on device
   */
  getBatteryOptimizationRecommendations(): string[] {
    if (Platform.OS !== 'android') {
      return [
        'iOS automatically manages background processes',
        'Ensure "Background App Refresh" is enabled in Settings',
        'Keep location services enabled for Here2Run',
      ];
    }

    const manufacturer = this.getManufacturer().toLowerCase();

    // Check for specific manufacturer guidance
    for (const [brand, guide] of Object.entries(this.MANUFACTURER_GUIDES)) {
      if (manufacturer.includes(brand)) {
        return guide;
      }
    }

    return this.MANUFACTURER_GUIDES.default;
  }

  /**
   * Check if battery optimization alert has been shown and acknowledged
   */
  private async hasShownBatteryAlert(): Promise<boolean> {
    return await storageService.hasSeenBackgroundNotification();
  }

  /**
   * Mark battery optimization alert as shown
   */
  private async markBatteryAlertAsShown(): Promise<void> {
    await storageService.markBackgroundNotificationShown();
  }

  /**
   * Show battery optimization alert with device-specific guidance
   * Will only show once unless forced
   */
  async showBatteryOptimizationAlert(forceShow = false): Promise<{
    userInteracted: boolean;
    openedSettings: boolean;
  }> {
    // Skip showing if not on Android or already shown (unless forced)
    if (Platform.OS !== 'android') {
      return { userInteracted: false, openedSettings: false };
    }

    if (!forceShow) {
      const alreadyShown = await this.hasShownBatteryAlert();
      if (alreadyShown) {
        return { userInteracted: true, openedSettings: false };
      }
    }

    return new Promise((resolve) => {
      const recommendations = this.getBatteryOptimizationRecommendations();
      const isAggressive = this.isAggressiveBatteryOptimizationDevice();

      const title = isAggressive
        ? 'Important: Battery Optimization Detected'
        : 'Battery Optimization Settings';

      const message = isAggressive
        ? 'Your device may stop GPS tracking when the screen is off. Follow these steps to ensure continuous tracking:\n\n' +
          recommendations.map((step, index) => `${index + 1}. ${step}`).join('\n\n')
        : 'For the best tracking experience, please:\n\n' +
          recommendations.map((step, index) => `${index + 1}. ${step}`).join('\n\n');

      Alert.alert(
        title,
        message,
        [
          {
            text: 'Open Settings',
            onPress: async () => {
              await this.openBatterySettings();
              await this.markBatteryAlertAsShown();
              resolve({ userInteracted: true, openedSettings: true });
            },
          },
          {
            text: 'Got It',
            style: 'cancel',
            onPress: async () => {
              await this.markBatteryAlertAsShown();
              resolve({ userInteracted: true, openedSettings: false });
            },
          },
        ],
        { cancelable: false },
      );
    });
  }

  /**
   * Reset the alert shown state - useful for testing or if settings change
   */
  async resetBatteryAlertShownState(): Promise<void> {
    // Since we're using storageService, we would need to add a method there to reset
    // For now, we can implement this by setting the value to 'false'
    await storageService.setAppSetting('background_notification_shown', 'false');
  }

  /**
   * Open device battery optimization settings
   */
  async openBatterySettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Try to open battery optimization settings
        await Linking.openSettings();
      } else {
        // On iOS, open general settings
        await Linking.openURL('App-prefs:');
      }
    } catch (error) {
      console.error('Error opening battery settings:', error);
      // Fallback to general settings
      try {
        await Linking.openSettings();
      } catch (fallbackError) {
        console.error('Error opening settings fallback:', fallbackError);
      }
    }
  }

  /**
   * Check if battery optimization is likely affecting the app
   */
  async checkBatteryOptimizationImpact(trackingStats: {
    lastLocationTime: number;
    consecutiveErrors: number;
    isBackgroundActive: boolean;
  }): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const now = Date.now();
    const timeSinceLastLocation = now - trackingStats.lastLocationTime;

    // Consider battery optimization impact if:
    // 1. No location updates for more than 5 minutes while tracking should be active
    // 2. Multiple consecutive errors
    // 3. Background tracking is supposed to be active but no recent updates
    const suspiciousGaps = timeSinceLastLocation > 300000; // 5 minutes
    const highErrorRate = trackingStats.consecutiveErrors > 3;
    const backgroundIssues = trackingStats.isBackgroundActive && timeSinceLastLocation > 120000; // 2 minutes

    return suspiciousGaps || highErrorRate || backgroundIssues;
  }

  /**
   * Show help message for battery optimization issues
   */
  showBatteryOptimizationHelp(): void {
    const recommendations = this.getBatteryOptimizationRecommendations();

    Alert.alert(
      'GPS Tracking Issues?',
      'If GPS tracking stops when your screen is off, your device may be optimizing battery usage. Try these steps:\n\n' +
        recommendations.map((step, index) => `${index + 1}. ${step}`).join('\n\n') +
        '\n\nAfter making these changes, restart the app and try tracking again.',
      [
        {
          text: 'Open Settings',
          onPress: () => this.openBatterySettings(),
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ],
    );
  }

  /**
   * Get a simple status object for battery optimization
   */
  getBatteryOptimizationStatus(): BatteryOptimizationStatus {
    const manufacturer = this.getManufacturer();
    const isOptimized = this.isAggressiveBatteryOptimizationDevice();

    return {
      isOptimized,
      canRequestExemption: Platform.OS === 'android',
      manufacturer,
      recommendations: this.getBatteryOptimizationRecommendations(),
    };
  }
}

export const batteryOptimizationService = new BatteryOptimizationService();
