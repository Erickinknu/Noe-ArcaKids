import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'NOE',
  slug: 'noe',
  version: '0.1.0.11',
  orientation: 'portrait',
  icon: './assets/images/noe-icon.png',
  scheme: 'noe',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.noe.parent',
  },
  android: {
    package: 'com.noe.parent',
    allowBackup: false,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/noe-adaptive-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#E6F4FE',
        image: './assets/images/noe-splash.png',
        imageWidth: 160,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;