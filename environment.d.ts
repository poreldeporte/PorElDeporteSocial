declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string
      NODE_ENV: 'development' | 'production' | 'test'
      SUPABASE_AUTH_JWT_SECRET: string

      EXPO_PUBLIC_URL: string
      NEXT_PUBLIC_URL: string

      EXPO_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_URL: string

      EXPO_PUBLIC_SUPABASE_ANON_KEY: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string

      EXPO_PUBLIC_SENTRY_DSN?: string
    }
  }
}

declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native'
  const value: ImageSourcePropType
  export default value
}

declare module '*.jpeg' {
  import type { ImageSourcePropType } from 'react-native'
  const value: ImageSourcePropType
  export default value
}

export {}
