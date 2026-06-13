const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo (workspace packages like packages/engine)
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and dependencies (look in apps/mobile node_modules and root node_modules)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Disable hierarchical lookup to force Metro to resolve symlinks in monorepo correctly
config.resolver.disableHierarchicalLookup = true;

// 4. Enable Package Exports to support the "exports" field in package.json files
config.resolver.unstable_enablePackageExports = true;

// 5. Custom Resolver to map ESM .js imports (from packages/engine etc.) to their .ts/.tsx source files
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If the import specifies a .js file, and it is a relative path (starts with ./ or ../)
  // or it is a path within our package (starts with @phopephum)
  if (moduleName.endsWith('.js') && (moduleName.startsWith('.') || moduleName.includes('@phopephum'))) {
    // Try to resolve the moduleName by stripping the .js extension and letting Metro search for ts/tsx
    const moduleNameWithoutJs = moduleName.slice(0, -3);
    try {
      return context.resolveRequest(context, moduleNameWithoutJs, platform);
    } catch (e) {
      // Fallback to default if resolution failed
    }
  }
  
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolve(context, moduleName, platform);
};

module.exports = config;
