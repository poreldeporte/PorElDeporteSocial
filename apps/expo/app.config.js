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
      url: 'https://u.expo.dev/0a84b488-72f9-4aef-8574-f4cc034909d1',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.poreldeporte.app',
      buildNumber: '44',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      softwareKeyboardLayoutMode: 'pan',
      adaptiveIcon: {
        foregroundImage: './assets/pixel-logo-ped.png',
        backgroundColor: '#FFFFFF',
      },
      package: 'com.poreldeporte.app',
      versionCode: 7,
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
      'expo-router',
      'expo-build-properties',
      'expo-font',
    ],
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: '0a84b488-72f9-4aef-8574-f4cc034909d1',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    owner: 'poreldeporte',
  },
}
