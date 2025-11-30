// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config')}
 */
const { getDefaultConfig } = require('expo/metro-config')
const MetroResolver = require('metro-resolver')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(__dirname, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

const nextShimPath = path.resolve(projectRoot, 'next-shim.js')

const defaultResolveRequest = config.resolver.resolveRequest ?? ((context, moduleName, platform) =>
  MetroResolver.resolve(context, moduleName, platform)
)

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'next' || moduleName.startsWith('next/')) {
    return {
      type: 'sourceFile',
      filePath: nextShimPath,
    }
  }
  return defaultResolveRequest(context, moduleName, platform)
}

// https://github.com/supabase/supabase-js/issues/1400#issuecomment-2843653869
config.resolver.unstable_enablePackageExports = false

config.transformer = { ...config.transformer, unstable_allowRequireContext: true }
config.transformer.minifierPath = require.resolve('metro-minify-terser')

config.resetCache = true

module.exports = config
