import { useThemeSetting as nextUseThemeSetting, useRootTheme as nextUseRootTheme } from '@tamagui/next-theme'

// is handled on _app.tsx
export const UniversalThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export const useRootTheme = nextUseRootTheme

export const useThemeSetting = () => {
  const themeSetting = nextUseThemeSetting()
  const resolvedTheme = themeSetting.resolvedTheme === 'dark' ? 'dark' : 'light'
  const current =
    themeSetting.current === 'dark' || themeSetting.current === 'light'
      ? themeSetting.current
      : resolvedTheme

  return {
    ...themeSetting,
    themes: ['light', 'dark'],
    current,
    resolvedTheme,
    set: (value: string) => {
      if (value === 'dark' || value === 'light') {
        themeSetting.set?.(value)
        return
      }
      themeSetting.set?.(resolvedTheme)
    },
    toggle: () => {
      const next = resolvedTheme === 'dark' ? 'light' : 'dark'
      themeSetting.set?.(next)
    },
  }
}

export const loadThemePromise = new Promise<any>((res) => res({}))
