import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { PlayIcon, PauseIcon, StopIcon, CancelIcon } from './TrackingIcons';

interface TrackingButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const StartButton = ({ onPress, disabled = false }: TrackingButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`w-20 h-20 rounded-full justify-center items-center ${
        disabled ? 'bg-gray-400' : 'bg-green-500'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
      <View className="ml-1">
        <PlayIcon size={32} color="white" />
      </View>
    </TouchableOpacity>
  );
};

export const PauseButton = ({ onPress, disabled = false }: TrackingButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`w-20 h-20 rounded-full justify-center items-center ${
        disabled ? 'bg-gray-400' : 'bg-blue-500'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
      <PauseIcon size={32} color="white" />
    </TouchableOpacity>
  );
};

export const StopButton = ({ onPress, disabled = false }: TrackingButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`w-20 h-20 rounded-full justify-center items-center ${
        disabled ? 'bg-gray-400' : 'bg-red-500'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
      <StopIcon size={28} color="white" />
    </TouchableOpacity>
  );
};

export const ResumeButton = ({ onPress, disabled = false }: TrackingButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`w-20 h-20 rounded-full justify-center items-center ${
        disabled ? 'bg-gray-400' : 'bg-green-500'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
      <View className="ml-1">
        <PlayIcon size={32} color="white" />
      </View>
    </TouchableOpacity>
  );
};

export const CancelButton = ({ onPress, disabled = false }: TrackingButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`w-20 h-20 rounded-full justify-center items-center ${
        disabled ? 'bg-gray-400' : 'bg-red-500'
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
      <CancelIcon size={28} color="white" />
    </TouchableOpacity>
  );
};
