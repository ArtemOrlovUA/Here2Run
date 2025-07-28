import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StatusBarStyle,
  Modal,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { getThemedStyles } from '../utils/theme';
import { storageService } from '../services/storageService';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: () => void;
  isImporting: boolean;
  importOption: 'replace' | 'add';
  onSetImportOption: (option: 'replace' | 'add') => void;
  theme: 'light' | 'dark';
  styles: any;
}

interface ThemeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedTheme: 'light' | 'dark' | 'system';
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  theme: 'light' | 'dark';
  styles: any;
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onClose,
  onImport,
  isImporting,
  importOption,
  onSetImportOption,
  theme,
  styles,
}) => (
  <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
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
          style={{
            flex: 1,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={onClose}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{ width: '100%', maxWidth: 400 }}>
            <View className={`${styles.cardBackground} rounded-2xl p-6 shadow-lg`}>
              <Text className={`text-xl font-bold mb-4 ${styles.textPrimary}`}>Import Data</Text>

              <View className="mb-6">
                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={() => onSetImportOption('add')}
                  activeOpacity={0.8}>
                  <View
                    className={`h-5 w-5 rounded-full border-2 ${
                      styles.borderColor
                    } mr-3 items-center justify-center ${
                      importOption === 'add' ? 'border-blue-500' : ''
                    }`}>
                    {importOption === 'add' && (
                      <View className="h-3 w-3 rounded-full bg-blue-500" />
                    )}
                  </View>
                  <Text className={`${styles.textPrimary} flex-1`}>
                    Add new data to current data
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center py-3"
                  onPress={() => onSetImportOption('replace')}
                  activeOpacity={0.8}>
                  <View
                    className={`h-5 w-5 rounded-full border-2 ${
                      styles.borderColor
                    } mr-3 items-center justify-center ${
                      importOption === 'replace' ? 'border-blue-500' : ''
                    }`}>
                    {importOption === 'replace' && (
                      <View className="h-3 w-3 rounded-full bg-blue-500" />
                    )}
                  </View>
                  <Text className={`${styles.textPrimary} flex-1`}>Replace all with new data</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-end mt-4">
                <TouchableOpacity
                  className="px-4 py-2 mr-2"
                  onPress={onClose}
                  disabled={isImporting}>
                  <Text className="text-gray-500">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-4 py-2 bg-blue-500 rounded-lg ${isImporting ? 'opacity-50' : ''}`}
                  onPress={onImport}
                  disabled={isImporting}>
                  <Text className="text-white font-medium">
                    {isImporting ? 'Importing...' : 'Select File'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
    </View>
  </Modal>
);

const ThemeModal: React.FC<ThemeModalProps> = ({
  visible,
  onClose,
  onSave,
  selectedTheme,
  onSetTheme,
  theme,
  styles,
}) => (
  <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
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
          style={{
            flex: 1,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={onClose}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={{ width: '100%', maxWidth: 400 }}>
            <View className={`${styles.cardBackground} rounded-2xl p-6 shadow-lg`}>
              <Text className={`text-xl font-bold mb-4 ${styles.textPrimary}`}>Select Theme</Text>

              <View className="mb-6">
                <View className={`border ${styles.borderColor} rounded-lg overflow-hidden`}>
                  <Picker
                    selectedValue={selectedTheme}
                    onValueChange={(value) => onSetTheme(value as 'light' | 'dark' | 'system')}
                    style={{
                      color: styles.textPrimary.includes('white') ? '#ffffff' : '#111827',
                      backgroundColor: styles.cardBackground.includes('gray-800')
                        ? '#1f2937'
                        : '#ffffff',
                    }}
                    dropdownIconColor={styles.iconColor}>
                    <Picker.Item label="Light" value="light" />
                    <Picker.Item label="Dark" value="dark" />
                    <Picker.Item label="System" value="system" />
                  </Picker>
                </View>
              </View>

              <View className="flex-row justify-end mt-4">
                <TouchableOpacity className="px-4 py-2 mr-2" onPress={onClose}>
                  <Text className="text-gray-500">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-4 py-2 bg-blue-500 rounded-lg" onPress={onSave}>
                  <Text className="text-white font-medium">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
    </View>
  </Modal>
);

export default function SettingsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, themePreference, setThemePreference } = useTheme();
  const styles = getThemedStyles();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importOption, setImportOption] = useState<'replace' | 'add'>('add');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(themePreference);

  const handleThemeChange = async (value: 'light' | 'dark' | 'system') => {
    await setThemePreference(value);
  };

  const handleSaveTheme = async () => {
    await handleThemeChange(selectedTheme);
    setThemeModalVisible(false);
  };

  const handleCancelTheme = () => {
    setSelectedTheme(themePreference);
    setThemeModalVisible(false);
  };

  const handleExportData = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      const data = await storageService.getAllRunsWithRoutes();

      if (data.length === 0) {
        Alert.alert('No Data', 'You have no runs to export.');
        return;
      }

      const jsonString = JSON.stringify(data, null, 2);

      // Create a temporary file
      const fileUri = FileSystem.documentDirectory + 'here2run_export.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Here2Run Data',
        });
      } else {
        Alert.alert('Sharing not available', 'File sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    if (isImporting) return;

    // Close modal right away so the system file picker is not obstructed
    setImportModalVisible(false);

    try {
      setIsImporting(true);

      // Pick the document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      // Read the file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      let importedData;

      try {
        importedData = JSON.parse(fileContent);
      } catch (error) {
        Alert.alert('Invalid File', 'The selected file is not a valid JSON file.');
        return;
      }

      // Validate the data structure
      if (!Array.isArray(importedData)) {
        Alert.alert('Invalid Data', 'The file does not contain valid run data.');
        return;
      }

      // Process the data based on selected option
      if (importOption === 'replace') {
        await storageService.deleteAllRuns();
      }

      // Import the data
      await storageService.importRuns(importedData);

      Alert.alert('Import Successful', `Successfully imported ${importedData.length} run(s).`);
    } catch (error) {
      console.error('Error importing data:', error);
      Alert.alert('Import Failed', 'Could not import your data. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View className={`flex-1 ${styles.backgroundColor}`} style={{ paddingTop: insets.top }}>
      <StatusBar
        barStyle={styles.statusBarStyle as StatusBarStyle}
        backgroundColor={styles.statusBarBgColor}
      />

      {/* Header */}
      <View className={`${styles.cardBackground} border-b ${styles.borderColor} px-6 py-4`}>
        <View className="flex-row items-center justify-center relative">
          <TouchableOpacity onPress={() => navigation.goBack()} className="absolute left-0">
            <Ionicons name="arrow-back" size={24} color={styles.iconColor} />
          </TouchableOpacity>
          <Text className={`text-2xl font-bold ${styles.textPrimary}`}>Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Theme Selector */}
        <TouchableOpacity
          className={`${styles.cardBackground} rounded-xl p-4 shadow-sm border ${styles.borderColor} mb-4`}
          onPress={() => setThemeModalVisible(true)}
          activeOpacity={0.7}>
          <View className="flex-row justify-between items-center">
            <Text className={`text-lg font-medium ${styles.textPrimary}`}>Theme</Text>
            <View className="flex-row items-center">
              <Text className={`text-base ${styles.textSecondary} mr-2 capitalize`}>
                {themePreference}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={styles.iconColor} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Export Data */}
        <TouchableOpacity
          className={`${styles.cardBackground} rounded-xl p-4 shadow-sm border ${styles.borderColor} mb-4`}
          onPress={handleExportData}
          disabled={isExporting}
          activeOpacity={0.7}>
          <View className="flex-row justify-between items-center">
            <Text
              className={`text-lg font-medium ${styles.textPrimary} ${
                isExporting ? 'opacity-50' : ''
              }`}>
              {isExporting ? 'Exporting...' : 'Export your data as JSON'}
            </Text>
            <Ionicons
              name="download-outline"
              size={24}
              color={isExporting ? '#9CA3AF' : styles.iconColor}
            />
          </View>
        </TouchableOpacity>

        {/* Import Data */}
        <TouchableOpacity
          className={`${styles.cardBackground} rounded-xl p-4 shadow-sm border ${styles.borderColor} mb-4`}
          onPress={() => setImportModalVisible(true)}
          activeOpacity={0.7}>
          <View className="flex-row justify-between items-center">
            <Text className={`text-lg font-medium ${styles.textPrimary}`}>Import data</Text>
            <Ionicons name="cloud-upload-outline" size={24} color={styles.iconColor} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Import Modal */}
      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImportData}
        isImporting={isImporting}
        importOption={importOption}
        onSetImportOption={setImportOption}
        theme={theme}
        styles={styles}
      />

      {/* Theme Modal */}
      <ThemeModal
        visible={themeModalVisible}
        onClose={handleCancelTheme}
        onSave={handleSaveTheme}
        selectedTheme={selectedTheme}
        onSetTheme={setSelectedTheme}
        theme={theme}
        styles={styles}
      />
    </View>
  );
}
