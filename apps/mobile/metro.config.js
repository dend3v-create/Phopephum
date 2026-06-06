const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Custom resolver to map .js imports (from ESM modules like packages/engine) to .ts/.tsx files
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith(".js") && (moduleName.startsWith("./") || moduleName.startsWith("../"))) {
    // Try to resolve as .ts first, then .tsx, then extensionless
    const candidates = [
      moduleName.slice(0, -3) + ".ts",
      moduleName.slice(0, -3) + ".tsx",
      moduleName.slice(0, -3)
    ];

    for (const candidate of candidates) {
      try {
        return context.resolveRequest(context, candidate, platform);
      } catch (err) {
        // ignore and try next
      }
    }
  }

  // Fallback to default behavior
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
