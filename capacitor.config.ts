import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plotlocator.app',
  appName: 'PlotLocator',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      permissions: {
        ios: {
          NSLocationWhenInUseUsageDescription: 'PlotLocator needs your location to show directions to your plots.',
          NSLocationAlwaysUsageDescription: 'PlotLocator needs your location to show directions to your plots.',
        },
      },
    },
  },
};

export default config;
