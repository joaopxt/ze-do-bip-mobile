const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure WASM is handled as an asset, not a source file
// This resolves "Unable to resolve module" by allowing .wasm extension
// And resolves "SyntaxError" by treating it as binary asset instead of JS source
config.resolver.assetExts.push('wasm');

module.exports = config;
