import { useMemo, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { PenSquare } from '@tamagui/lucide-icons'

import {
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  XStack,
  YStack,
} from '@my/ui/public'
import { BrandStamp } from 'app/components/BrandStamp'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useUser } from 'app/utils/useUser'
import { useAppRouter } from 'app/utils/useAppRouter'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GroupListScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const { primaryColor } = useBrand()
  const { isAdmin, isLoading } = useUser()
  const { activeCommunityId } = useActiveCommunity()
  const router = useAppRouter()
  const groupsQuery = api.groups.list.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: isAdmin && !isLoading && Boolean(activeCommunityId) }
  )
  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (!isAdmin) {
    return (
      <YStack f={1} ai="center" jc="center" px="$6" gap="$2" pt={topInset ?? 0}>
        <SizableText size="$6" fontWeight="700">
          Admin access only
        </SizableText>
        <Paragraph theme="alt2" textAlign="center">
          Only admins can manage groups.
        </Paragraph>
      </YStack>
    )
  }

  if (groupsQuery.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = {
    ...screenContentContainerStyle,
    paddingTop: headerSpacer ? 0 : screenContentContainerStyle.paddingTop,
    flexGrow: 1,
  }
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <ScrollView
      style={{ flex: 1 }}
      {...scrollViewProps}
      contentContainerStyle={mergedContentStyle}
    >
      {headerSpacer}
      <YStack maw={900} mx="auto" w="100%" space="$4" py="$4">
        <YStack gap="$2">
          <SizableText size="$6" fontWeight="700">
            Groups
          </SizableText>
          <Paragraph theme="alt2">Create private audiences for games.</Paragraph>
          <YStack h={2} w={56} br={999} bg={primaryColor} />
        </YStack>
        {groupsQuery.isError ? (
          <Card bordered bw={1} boc="$color12" br="$5" p="$4">
            <Paragraph theme="alt2">Unable to load groups.</Paragraph>
            <Button
              mt="$3"
              onPress={() => groupsQuery.refetch()}
              disabled={groupsQuery.isFetching}
            >
              {groupsQuery.isFetching ? 'Refreshing...' : 'Retry'}
            </Button>
          </Card>
        ) : groups.length === 0 ? (
          <Card bordered bw={1} boc="$color12" br="$5" p="$4">
            <Paragraph theme="alt2">No groups yet.</Paragraph>
          </Card>
        ) : (
          <YStack gap="$2">
            {groups.map((group) => (
              <Card key={group.id} bordered bw={1} boc="$color12" br="$5" p="$4" gap="$3">
                <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
                  <YStack gap="$0.5" flex={1} minWidth={200}>
                    <SizableText size="$5" fontWeight="600">
                      {group.name}
                    </SizableText>
                    <Paragraph theme="alt2" size="$2">
                      {group.memberCount} members
                    </Paragraph>
                  </YStack>
                  <Button
                    chromeless
                    size="$3"
                    icon={PenSquare}
                    aria-label="Edit group"
                    onPress={() => router.push(`/settings/groups/${group.id}`)}
                    pressStyle={{ opacity: 0.7 }}
                  />
                </XStack>
              </Card>
            ))}
          </YStack>
        )}
        <BrandStamp />
      </YStack>
    </ScrollView>
  )
}
