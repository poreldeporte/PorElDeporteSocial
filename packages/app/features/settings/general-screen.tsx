import type { ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { FormWrapper, H2, H4, KVTable, Separator, SizableText, YStack, isWeb, styled } from '@my/ui/public'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { useUser } from 'app/utils/useUser'
import { Link } from 'solito/link'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GeneralSettingsScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const { user, profile } = useUser()

  return (
    <FormWrapper>
      {isWeb && (
        <YStack px="$4" py="$4" pb="$2">
          <H2>General</H2>
        </YStack>
      )}
      <FormWrapper.Body
        gap="$10"
        px={SCREEN_CONTENT_PADDING.horizontal}
        pt={headerSpacer ? 0 : SCREEN_CONTENT_PADDING.top}
        pb={SCREEN_CONTENT_PADDING.bottom}
        scrollProps={scrollProps}
      >
        {headerSpacer}
        <Section>
          <KVTable>
            <YStack gap="$4">
              <H4>Profile Data</H4>
              <Separator />
            </YStack>
            <KVTable.Row>
              <KVTable.Key>
                <SizableText fow="900">Name</SizableText>
              </KVTable.Key>
              <KVTable.Value gap="$4">
                <SizableText>{profile?.name}</SizableText>
                <Link href="/profile/edit">
                  <SizableText textDecorationLine="underline">Change</SizableText>
                </Link>
              </KVTable.Value>
            </KVTable.Row>
          </KVTable>
        </Section>

        <Section>
          <KVTable>
            <YStack gap="$4">
              <H4>Account Data</H4>
              <Separator />
            </YStack>
            <KVTable.Row>
              <KVTable.Key>
                <SizableText fow="900">Email</SizableText>
              </KVTable.Key>
              <KVTable.Value gap="$4">
                <SizableText>{profile?.email ?? '—'}</SizableText>
                <Link href="/profile/edit">
                  <SizableText textDecorationLine="underline">Change</SizableText>
                </Link>
              </KVTable.Value>
            </KVTable.Row>

            <KVTable.Row>
              <KVTable.Key>
                <SizableText fow="900">User ID</SizableText>
              </KVTable.Key>
              <KVTable.Value>
                <SizableText>{user?.id}</SizableText>
              </KVTable.Value>
            </KVTable.Row>
          </KVTable>
        </Section>
      </FormWrapper.Body>
    </FormWrapper>
  )
}

const Section = styled(YStack, {
  boc: '$borderColor',
  bw: 1,
  p: '$4',
  br: '$4',
})
