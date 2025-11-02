import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  webpackFinal: async (config) => {
    // Exclude .map files from being processed
    config.module?.rules?.push({
      test: /\.map$/,
      type: 'asset/resource',
      exclude: [/node_modules\/.*\.map$/, /.*\.native\.map$/],
    })

    return config
  },
  stories: ['../../../packages/ui/**/*.stories.@(ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    {
      name: '@storybook/addon-react-native-web',
      options: {
        modulesToTranspile: [
          'solito',
          'expo-linking',
          'expo-constants',
          'expo-modules-core',
          'expo-document-picker',
          'expo-av',
          'expo-asset',
          'react-native-reanimated',
        ],
        babelPlugins: [
          '@babel/plugin-proposal-export-namespace-from',
          'react-native-reanimated/plugin',
        ],
      },
    },
  ],
  framework: '@storybook/nextjs',
  core: {
    builder: {
      name: '@storybook/builder-webpack5',
      options: {
        fsCache: true,
        lazyCompilation: true,
      },
    },
  },
  docs: {
    autodocs: true,
  },
}
export default config
