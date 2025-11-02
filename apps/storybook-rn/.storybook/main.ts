import { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: [
    '../components/**/*.stories.?(ts|tsx|js|jsx)',
    {
      directory: '../../../packages/ui',
      titlePrefix: 'react-native-ui',
      files: '**/*.stories.?(ts|tsx|js|jsx)',
    },
  ],
  addons: [
    { name: '@storybook/addon-ondevice-controls' },
    '@storybook/addon-ondevice-actions',
  ],
  reactNative: {
    playFn: false,
  },
};

export default main;