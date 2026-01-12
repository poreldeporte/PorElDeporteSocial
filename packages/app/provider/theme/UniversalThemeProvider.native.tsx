import { useIsomorphicLayoutEffect } from '@my/ui/public'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import type {
  ThemeProviderProps,
  useThemeSetting as next_useThemeSetting,
} from '@tamagui/next-theme'
import { StatusBar } from 'expo-status-bar'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Appearance } from 'react-native'

type ThemeContextValue = (ThemeProviderProps & { current?: string | null }) | null
export const ThemeContext = createContext<ThemeContextValue>(null)

type ThemeName = 'light' | 'dark'

// start early
let persistedTheme: ThemeName | null = null
export const loadThemePromise = AsyncStorage.getItem('@preferred_theme')
loadThemePromise.then((val) => {
  persistedTheme = val === 'light' || val === 'dark' ? (val as ThemeName) : null
})

export const UniversalThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [current, setCurrent] = useState<ThemeName>(() => {
    return persistedTheme ?? Appearance.getColorScheme() ?? 'light'
  })

  useIsomorphicLayoutEffect(() => {
    async function main() {
      await loadThemePromise
      setCurrent((prev) => persistedTheme ?? prev) // Set theme after loading
    }
    main()
  }, [])

  useEffect(() => {
    if (current) {
      AsyncStorage.setItem('@preferred_theme', current)
    }
  }, [current])

  const themeContext = useMemo(() => {
    return {
      themes: ['light', 'dark'],
      onChangeTheme: (next: string) => {
        setCurrent(next as ThemeName)
      },
      current,
      systemTheme: current,
    } satisfies ThemeContextValue
  }, [current])

  return (
    <ThemeContext.Provider value={themeContext}>
      <InnerProvider>{children}</InnerProvider>
    </ThemeContext.Provider>
  )
}

const InnerProvider = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useThemeSetting()

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  )
}

export const useThemeSetting: typeof next_useThemeSetting = () => {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useThemeSetting should be used within the context provider.')
  }

  const resolvedTheme = context.current ?? 'light'

  const outputContext: ReturnType<typeof next_useThemeSetting> = {
    ...context,
    systemTheme: context.systemTheme as 'light' | 'dark',
    themes: context.themes!,
    current: context.current ?? 'light',
    resolvedTheme,
    set: (value) => {
      const next = value === 'dark' || value === 'light' ? value : 'light'
      context.onChangeTheme?.(next)
    },
    toggle: () => {
      const next = (context.current as ThemeName) === 'dark' ? 'light' : 'dark'
      context.onChangeTheme?.(next)
    },
  }

  return outputContext
}

export const useRootTheme = () => {
  const context = useThemeSetting()
  return [context.current ?? 'light', context.set]
}
