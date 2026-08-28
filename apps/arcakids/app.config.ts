import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'ARCA KIDS',
  slug: 'arcakids',
  version: '0.1.0.11',
  orientation: 'portrait',
  icon: './assets/images/arca-kids.png',
  scheme: 'arcakids',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.arcakids.child',
  },
  android: {
    package: 'com.arcakids.child',
    allowBackup: false,
    adaptiveIcon: {
      backgroundColor: '#208AEF',
      foregroundImage: './assets/images/arca-kids.png',
      backgroundImage: './assets/images/arca-kids.png',
      monochromeImage: './assets/images/arca-kids.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.USE_BIOMETRIC',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow ARCA KIDS to use your camera to scan pairing QR codes.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/arca-kids.png',
        resizeMode: 'contain',
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;