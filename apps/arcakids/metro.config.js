const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;