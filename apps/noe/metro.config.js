const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

module.exports = config;
