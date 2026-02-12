import 'dotenv/config';

const projectId = process.env.EAS_PROJECT_ID || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

export default {
  expo: {
    name: 'SeekerMigrate',
    slug: 'seekermigrate',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.brand.png',
    scheme: 'seekermigrate',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash.brand.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'io.buidlerlabs.seekermigrate',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.brand.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.brand.png',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId,
      },
    },
  },
};
