const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Configure resolver for path aliases
config.resolver = {
  ...config.resolver,
  alias: {
    "@": path.resolve(__dirname, "src"),
  },
};

module.exports = config;
