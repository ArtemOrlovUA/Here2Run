import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import StyledButton from './StyledButton';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps): React.JSX.Element {
  const { theme } = useTheme();
  const styles = getThemedStyles();

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <BlurView
          intensity={20}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
          }}
          experimentalBlurMethod="dimezisBlurView">
          <TouchableOpacity
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={1}
            onPress={onCancel}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={{ width: '100%', maxWidth: 400 }}>
              <View className={`${styles.cardBackground} rounded-2xl p-6 shadow-lg`}>
                <Text className={`text-lg font-semibold ${styles.textPrimary} mb-4 text-center`}>
                  {title}
                </Text>
                <Text className={`${styles.textSecondary} mb-6 text-center`}>{message}</Text>

                <View className="flex-row gap-x-3">
                  <View className="flex-1">
                    <StyledButton title="No" onPress={onCancel} variant="secondary" fullWidth />
                  </View>
                  <View className="flex-1">
                    <StyledButton title="Yes" onPress={onConfirm} variant="danger" fullWidth />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Modal>
  );
}
