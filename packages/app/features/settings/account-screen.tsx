import { StyleSheet, type ScrollViewProps } from 'react-native'
import { Children, type ReactNode, useState } from 'react'

import {
  Button,
  ConfirmDialog,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { SCREEN_CONTENT_PADDING, screenContentContainerStyle } from 'app/constants/layout'
import { useLogout } from 'app/utils/auth/logout'
import { api } from 'app/utils/api'
import { useUser } from 'app/utils/useUser'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

const SECTION_LETTER_SPACING = 1.6

export const AccountSettingsScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const logout = useLogout()
  const toast = useToastController()
  const { user } = useUser()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const deactivateMutation = api.account.deactivate.useMutation({
    onSuccess: () => {
      setDeactivateOpen(false)
      toast.show('Account deactivated')
      logout({ userId: user?.id ?? null })
    },
    onError: (error) => {
      toast.show('Unable to deactivate', { message: error.message })
    },
  })

  const deleteMutation = api.account.delete.useMutation({
    onSuccess: () => {
      setDeleteOpen(false)
      toast.show('Account deleted')
      logout({ userId: user?.id ?? null })
    },
    onError: (error) => {
      toast.show('Unable to delete account', { message: error.message })
    },
  })

  const isBusy = deactivateMutation.isPending || deleteMutation.isPending

  const { contentContainerStyle, ...scrollViewOnly } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <ScrollView {...scrollViewOnly} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$5">
        <YStack gap="$2">
          <SizableText size="$8" fontWeight="700">
            Account
          </SizableText>
          <Paragraph theme="alt2" size="$3">
            Deactivate keeps your name and history but disables login. Delete removes personal data,
            removes you from leaderboards, and removes your name from past games.
          </Paragraph>
        </YStack>
        <SettingSection
          title="Account actions"
          note="Delete is permanent. You can sign up again, but your name will be removed from past games."
        >
          <SettingRow label="Deactivate account">
            <Button
              size="$2"
              onPress={() => setDeactivateOpen(true)}
              disabled={isBusy}
            >
              Deactivate
            </Button>
          </SettingRow>
          <SettingRow label="Delete account">
            <Button
              size="$2"
              theme="red"
              onPress={() => setDeleteOpen(true)}
              disabled={isBusy}
            >
              Delete
            </Button>
          </SettingRow>
        </SettingSection>
      </YStack>

      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate account?"
        description="Your history stays visible. You will be logged out and cannot sign in unless reactivated."
        confirmLabel="Deactivate"
        confirmPending={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete account?"
        description="This removes personal data, removes you from leaderboards, and removes your name from past games. This cannot be undone."
        confirmLabel="Delete"
        confirmTone="destructive"
        confirmPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </ScrollView>
  )
}

const SettingSection = ({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) => {
  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <SizableText
          size="$2"
          fontWeight="700"
          color="$color10"
          letterSpacing={SECTION_LETTER_SPACING}
        >
          {title.toUpperCase()}
        </SizableText>
        {note ? (
          <Paragraph theme="alt2" size="$2">
            {note}
          </Paragraph>
        ) : null}
      </YStack>
      <SettingRowGroup>{children}</SettingRowGroup>
    </YStack>
  )
}

const SettingRowGroup = ({ children }: { children: ReactNode }) => {
  const rows = Children.toArray(children).filter(Boolean)
  return (
    <YStack>
      {rows.map((row, index) => (
        <YStack key={`row-${index}`}>
          {row}
          {index < rows.length - 1 ? <Separator bw="$0.5" boc="$color4" /> : null}
        </YStack>
      ))}
    </YStack>
  )
}

const SettingRow = ({ label, children }: { label: string; children: ReactNode }) => {
  return (
    <YStack>
      <XStack ai="center" jc="space-between" minHeight={60} py="$2" gap="$3">
        <SizableText size="$4" fontWeight="600" color="$color" flex={1} numberOfLines={2}>
          {label}
        </SizableText>
        {children}
      </XStack>
    </YStack>
  )
}
