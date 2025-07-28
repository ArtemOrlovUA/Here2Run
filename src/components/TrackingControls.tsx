import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  StartButton,
  PauseButton,
  StopButton,
  ResumeButton,
  CancelButton,
} from './TrackingButtons';
import ConfirmationDialog from './ConfirmationDialog';
import { GPSStatus } from '../types/gps';

interface TrackingControlsProps {
  isTracking: boolean;
  isPaused: boolean;
  gpsStatus: GPSStatus;
  onStartRun: () => void;
  onPauseResume: () => void;
  onStopAndReview: () => void;
  onQuitRun: () => void;
}

export default function TrackingControls({
  isTracking,
  isPaused,
  gpsStatus,
  onStartRun,
  onPauseResume,
  onStopAndReview,
  onQuitRun,
}: TrackingControlsProps): React.JSX.Element {
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Fixed distance from center for all buttons
  const BUTTON_DISTANCE = 100;

  // Animation values
  const leftButtonPosition = useSharedValue(0);
  const rightButtonPosition = useSharedValue(0);
  const mainButtonScale = useSharedValue(1);
  const leftButtonOpacity = useSharedValue(0);
  const rightButtonOpacity = useSharedValue(0);

  // Animation functions
  const animateToRunningState = () => {
    if (hasAnimated) return; // Prevent re-animation

    setHasAnimated(true);

    // First scale down the main button
    mainButtonScale.value = withSequence(
      withTiming(0.8, { duration: 150 }),
      withTiming(0, { duration: 200 }),
    );

    // Then slide out the side buttons with delay
    setTimeout(() => {
      leftButtonPosition.value = withTiming(-BUTTON_DISTANCE, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      rightButtonPosition.value = withTiming(BUTTON_DISTANCE, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      leftButtonOpacity.value = withTiming(1, { duration: 300 });
      rightButtonOpacity.value = withTiming(1, { duration: 300 });
    }, 200);
  };

  const animateToStoppedState = () => {
    setHasAnimated(false);

    // Hide side buttons
    leftButtonOpacity.value = withTiming(0, { duration: 200 });
    rightButtonOpacity.value = withTiming(0, { duration: 200 });

    // Move buttons back to center
    leftButtonPosition.value = withTiming(0, { duration: 300 });
    rightButtonPosition.value = withTiming(0, { duration: 300 });

    // Show main button
    setTimeout(() => {
      mainButtonScale.value = withTiming(1, { duration: 300 });
    }, 200);
  };

  // Handle state changes
  useEffect(() => {
    if (isTracking && !hasAnimated) {
      animateToRunningState();
    } else if (!isTracking && hasAnimated) {
      animateToStoppedState();
    }
  }, [isTracking]);

  // Animated styles
  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainButtonScale.value }],
  }));

  const leftButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftButtonPosition.value }],
    opacity: leftButtonOpacity.value,
  }));

  const rightButtonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightButtonPosition.value }],
    opacity: rightButtonOpacity.value,
  }));

  // Button press handlers
  const handleStartPress = () => {
    onStartRun();
  };

  const handlePausePress = () => {
    onPauseResume();
  };

  const handleStopPress = () => {
    onStopAndReview();
  };

  const handleResumePress = () => {
    onPauseResume();
  };

  const handleCancelPress = () => {
    setShowCancelConfirmation(true);
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirmation(false);
    onQuitRun();
  };

  // Don't show controls if GPS is not available and not currently tracking
  if ((!gpsStatus.servicesEnabled || gpsStatus.permission !== 'granted') && !isTracking) {
    return <View className="px-6 pb-6" />;
  }

  return (
    <View className="px-6 pb-6">
      <View className="relative h-32 w-full flex justify-center items-center">
        {/* Initial state - single start button */}
        {!isTracking && (
          <Animated.View style={mainButtonStyle} className="absolute">
            <StartButton onPress={handleStartPress} />
          </Animated.View>
        )}

        {/* Running state - pause and stop buttons */}
        {isTracking && !isPaused && (
          <>
            <Animated.View style={leftButtonStyle} className="absolute">
              <PauseButton
                onPress={handlePausePress}
                disabled={!gpsStatus.servicesEnabled || gpsStatus.permission !== 'granted'}
              />
            </Animated.View>

            <Animated.View style={rightButtonStyle} className="absolute">
              <StopButton onPress={handleStopPress} />
            </Animated.View>
          </>
        )}

        {/* Paused state - resume and cancel buttons */}
        {isTracking && isPaused && (
          <>
            <Animated.View style={leftButtonStyle} className="absolute">
              <ResumeButton
                onPress={handleResumePress}
                disabled={!gpsStatus.servicesEnabled || gpsStatus.permission !== 'granted'}
              />
            </Animated.View>

            <Animated.View style={rightButtonStyle} className="absolute">
              <CancelButton onPress={handleCancelPress} />
            </Animated.View>
          </>
        )}
      </View>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        visible={showCancelConfirmation}
        title="Cancel Run"
        message="Are you sure you want to cancel this run? All data will be lost."
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelConfirmation(false)}
      />
    </View>
  );
}
