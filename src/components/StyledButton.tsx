import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function StyledButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
}: StyledButtonProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();

  const getVariantStyles = () => {
    if (disabled) {
      return theme === 'dark' ? 'bg-gray-600 border-gray-600' : 'bg-gray-300 border-gray-300';
    }

    switch (variant) {
      case 'secondary':
        return `${styles.cardBackground} ${styles.borderColor} border`;
      case 'success':
        return 'bg-green-500 border-green-500';
      case 'danger':
        return 'bg-red-500 border-red-500';
      default:
        return 'bg-blue-500 border-blue-500'; // Keep blue accent
    }
  };

  const getTextStyles = () => {
    if (disabled) {
      return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    }

    switch (variant) {
      case 'secondary':
        return styles.textPrimary;
      default:
        return 'text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        rounded-lg 
        ${getVariantStyles()} 
        ${getSizeStyles()} 
        ${fullWidth ? 'w-full' : ''} 
        flex-row 
        items-center 
        justify-center
        ${disabled ? 'opacity-50' : ''}
      `}>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? styles.iconColor : 'white'}
          className="mr-2"
        />
      )}
      <Text className={`font-semibold ${getTextStyles()} ${getTextSizeStyles()}`}>{title}</Text>
    </TouchableOpacity>
  );
}
