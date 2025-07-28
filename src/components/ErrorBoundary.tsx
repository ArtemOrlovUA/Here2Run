import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center px-6 bg-gray-50">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            Oops! Something went wrong
          </Text>
          <Text className="text-gray-600 text-center mb-6 text-base">
            We're sorry for the inconvenience. The app encountered an error.
          </Text>
          {__DEV__ && this.state.error && (
            <Text className="text-red-500 text-sm mb-6 text-center">
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity onPress={this.handleRetry} className="bg-blue-500 px-6 py-3 rounded-lg">
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
