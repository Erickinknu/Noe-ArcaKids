import type { ExpoConfig } from 'expo/config';

// @ts-ignore
const fs = require('fs');
// @ts-ignore
const path = require('path');

// @ts-ignore
const googleServicesAvailable = fs.existsSync(
  // @ts-ignore
  path.resolve(__dirname, 'google-services.json')
);

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
  name: 'NOE',
  slug: 'noe',
  version: '1.4.0',
  orientation: 'portrait',
  icon: './assets/images/noe-icon.png',
  scheme: 'noe',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.noe.parent',
    buildNumber: '1',
  },
  android: {
    package: 'com.noe.parent',
    versionCode: 12,
    allowBackup: false,
    ...(googleServicesAvailable ? { googleServicesFile: './google-services.json' } : {}),
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
    'expo-local-authentication',
    [
      'expo-notifications',
      {
        color: '#0A84FF',
        defaultChannel: 'default',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#E6F4FE',
        image: './assets/images/noe-splash.png',
        imageWidth: 160,
      },
    ],
    ...sentryPlugins,
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;