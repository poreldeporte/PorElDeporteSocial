import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'
import 'react-native-url-polyfill/auto'
import React from 'react'
import * as Sentry from '@sentry/react-native'

//NOTE: do not remove. this is a workaround for build to work with expo v51.0.0
React.AnimatedComponent = ({ children }) => <>{children}</>

const sentryEnabled = process.env.APP_ENV === 'production' && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN)

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV,
  })
}

// Must be exported or Fast Refresh won't update the context
export function App() {
  const ctx = require.context('./app')
  return <ExpoRoot context={ctx} />
}

const RootComponent = sentryEnabled ? Sentry.wrap(App) : App

registerRootComponent(RootComponent)
