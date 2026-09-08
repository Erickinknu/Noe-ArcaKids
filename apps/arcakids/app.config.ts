import type { ExpoConfig } from 'expo/config';

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryPlugins: NonNullable<ExpoConfig['plugins']> = sentryOrg && sentryProject
  ? [
      [
        '@sentry/react-native/expo',
        { organization: sentryOrg, project: sentryProject },
      ],
    ]
  : [];

const config: ExpoConfig = {
  name: 'ARCA KIDS',
  slug: 'arcakids',
  version: '1.3.2',
  orientation: 'portrait',
  icon: './assets/images/arca-kids.png',
  scheme: 'arcakids',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.arcakids.child',
    buildNumber: '1',
  },
  android: {
    package: 'com.arcakids.child',
    versionCode: 7,
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
    '../../plugins/with-device-owner',
    ...sentryPlugins,
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;