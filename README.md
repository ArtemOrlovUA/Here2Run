# Here2Run - GPS Running Tracker

A modern mobile GPS running tracker built with React Native and Expo, designed for run tracking with offline capabilities and comprehensive analytics.

## Features

- **Real-time GPS Tracking** - Accurate location tracking
- **Route Visualization** - Interactive maps showing your running routes
- **Run Analytics** - Distance, duration, pace, and calorie tracking
- **Run History** - Complete history of all saved runs with detailed statistics
- **Offline First** - All data stored locally, works without internet connection
- **Background Tracking** - Continues tracking when app is minimized
- **Dark/Light Theme** - Customizable UI themes

## Tech Stack

- **Framework**: Expo SDK (Managed Workflow)
- **Language**: TypeScript
- **UI**: React Native with NativeWind (Tailwind CSS)
- **Navigation**: React Navigation v7
- **Database**: WatermelonDB (Local SQLite)
- **Maps**: React Native Maps
- **Location**: Expo Location + Task Manager
- **State Management**: React Context + Local Storage

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Here2Run
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   - Add Google Maps API key to .env
   - Ensure location permissions are properly configured

## Build & Deploy

The project uses EAS Build for production builds:

```bash
# Development build
eas build --profile development

# Production build
eas build --profile production
```
