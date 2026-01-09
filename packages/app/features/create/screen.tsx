import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { Paragraph, ScrollView, YStack } from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'
import { usePathname } from 'app/utils/usePathname'
import { useUser } from 'app/utils/useUser'
import { useRouter } from 'solito/router'

import { CreateGameForm } from './CreateGameForm'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const CreateScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin } = useUser()

  const handleSuccess = () => {
    if (pathname === '/create') {
      router.replace('/games')
    } else {
      router.back()
    }
  }

  if (!isAdmin) {
    const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
    const baseContentStyle = headerSpacer
      ? { ...screenContentContainerStyle, paddingTop: 0, flexGrow: 1 }
      : { ...screenContentContainerStyle, flexGrow: 1 }
    const mergedContentStyle = Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
    return (
      <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <YStack w="100%" maxWidth={660} mx="auto" gap="$4">
          <Paragraph theme="alt1">
            Only admins can schedule games. Reach out to a community organizer if you need access.
          </Paragraph>
        </YStack>
      </ScrollView>
    )
  }
  return (
    <YStack f={1}>
      <CreateGameForm
        onSuccess={handleSuccess}
        headerSpacer={headerSpacer}
        scrollProps={scrollProps}
      />
    </YStack>
  )
}
