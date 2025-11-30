export default {
  expo: {
    name: 'Por El Deporte',
    slug: 'por-el-deporte',
    jsEngine: 'hermes',
    scheme: 'poreldeporte',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/pixel-logo-ped.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/pixel-logo-ped.png',
      contentFit: 'contain',
      backgroundColor: '#ffffff',
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/b5f02af2-6475-4d9e-81b3-664f89564580',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.poreldeporte.app',
      buildNumber: '6',
    },
    android: {
      softwareKeyboardLayoutMode: 'pan',
      adaptiveIcon: {
        foregroundImage: './assets/pixel-logo-ped.png',
        backgroundColor: '#FFFFFF',
      },
      package: 'com.poreldeporte.app',
      permissions: ['android.permission.RECORD_AUDIO'],
      versionCode: 3,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/pixel-logo-ped.png',
          color: '#ffffff',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          // https://react-native-google-signin.github.io/docs/setting-up/expo
          iosUrlScheme: process.env.GOOGLE_IOS_SCHEME,
        },
      ],
      'expo-apple-authentication',
      'expo-router',
      'expo-build-properties',
      'expo-font',
    ],
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: 'b5f02af2-6475-4d9e-81b3-664f89564580',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    owner: 'poreldeporte',
  },
}
