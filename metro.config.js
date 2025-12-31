const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Only add path alias for "@" - no custom resolvers
config.resolver = {
  ...config.resolver,
  alias: {
    "@": path.resolve(__dirname, "src"),
  },
};

module.exports = config;
