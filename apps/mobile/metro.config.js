// Metro configuration for the Tennisfolio Expo app inside the pnpm monorepo.
//
// pnpm keeps an *isolated* node_modules (a symlinked virtual store under
// `<root>/node_modules/.pnpm`) rather than a flat tree. Metro's defaults assume
// the flat npm/yarn layout, so a monorepo needs three explicit tweaks to find
// both the app's dependencies and the workspace packages it imports
// (`@tennisfolio/core` via `workspace:*`):
//
//   1. watchFolders    — watch the whole monorepo so edits to packages/core are
//                        picked up and its files are inside Metro's roots.
//   2. nodeModulesPaths — resolve modules from the app first, then the root
//                        store; ordering matters so the app's React 19 wins over
//                        web's React 18 (both live in the same workspace).
//
// We deliberately leave Metro's *hierarchical* lookup enabled (i.e. we do NOT
// set resolver.disableHierarchicalLookup). Under pnpm's isolated store a
// package's own transitive deps — e.g. expo-router requiring @expo/metro-runtime
// — are symlinked into that package's node_modules inside `.pnpm/...`, not into
// the app or root node_modules. Hierarchical lookup is what lets Metro walk up
// from the requiring file into the store and find them; disabling it breaks the
// bundle. Symlink following (unstable_enableSymlinks) is on by default in the
// Metro that ships with SDK 57. See https://docs.expo.dev/guides/monorepos/.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
