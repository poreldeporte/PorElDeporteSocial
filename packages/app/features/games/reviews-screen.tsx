import { type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { Star } from '@tamagui/lucide-icons'

import { Button, Card, Paragraph, ScrollView, SizableText, Spinner, XStack, YStack } from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { api } from 'app/utils/api'
import { useUser } from 'app/utils/useUser'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

const STAR_VALUES = [1, 2, 3, 4, 5]

export const GameReviewsScreen = ({
  gameId,
  scrollProps,
  headerSpacer,
}: { gameId: string } & ScrollHeaderProps) => {
  const { isAdmin, isLoading: isLoadingUser } = useUser()
  const { primaryColor } = useBrand()
  const { data, isLoading, error, refetch } = api.reviews.listByGame.useQuery(
    { gameId },
    { enabled: isAdmin && !isLoadingUser && Boolean(gameId) }
  )
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )

  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <YStack gap="$2">
          <SizableText size="$7" fontWeight="700">
            Game reviews
          </SizableText>
          <Paragraph theme="alt2">Player feedback after the run.</Paragraph>
          <YStack h={2} w={56} br={999} bg={primaryColor} />
        </YStack>

        {isLoadingUser ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <XStack ai="center" jc="center" py="$4">
              <Spinner />
            </XStack>
          </Card>
        ) : !isAdmin ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <Paragraph theme="alt2">Admins only.</Paragraph>
          </Card>
        ) : isLoading ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <XStack ai="center" jc="center" py="$4">
              <Spinner />
            </XStack>
          </Card>
        ) : error ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <YStack gap="$2">
              <Paragraph theme="alt1">Unable to load reviews.</Paragraph>
              <Button br="$10" size="$3" onPress={() => refetch()}>
                Retry
              </Button>
            </YStack>
          </Card>
        ) : !data || data.reviews.length === 0 ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <Paragraph theme="alt2">No feedback yet.</Paragraph>
          </Card>
        ) : (
          <YStack gap="$3">
            <SummaryCard averageRating={data.summary.averageRating} count={data.summary.count} />
            {data.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  )
}

const SummaryCard = ({ averageRating, count }: { averageRating: number; count: number }) => (
  <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
    <YStack gap="$2">
      <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
        <YStack>
          <SizableText size="$7" fontWeight="700">
            {averageRating.toFixed(1)}
          </SizableText>
          <Paragraph theme="alt2" size="$2">
            Average rating
          </Paragraph>
        </YStack>
        <YStack ai="flex-end">
          <SizableText size="$7" fontWeight="700">
            {count}
          </SizableText>
          <Paragraph theme="alt2" size="$2">
            Reviews
          </Paragraph>
        </YStack>
      </XStack>
      <StarRow rating={Math.round(averageRating)} />
    </YStack>
  </Card>
)

const ReviewCard = ({
  review,
}: {
  review: {
    id: string
    rating: number | null
    comment: string | null
    createdAt: string | null
    player: {
      id: string | null
      name: string
      avatarUrl: string | null
      jerseyNumber: number | null
    }
  }
}) => {
  const name = review.player.name ?? 'Member'
  const jerseyLabel =
    review.player.jerseyNumber != null ? `#${review.player.jerseyNumber}` : null
  return (
    <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
      <YStack gap="$2">
        <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
          <YStack gap="$0.25">
            <SizableText size="$5" fontWeight="600">
              {name}
            </SizableText>
            {jerseyLabel ? (
              <Paragraph theme="alt2" size="$2">
                {jerseyLabel}
              </Paragraph>
            ) : null}
          </YStack>
          <StarRow rating={review.rating ?? 0} />
        </XStack>
        {review.comment ? (
          <Paragraph>{review.comment}</Paragraph>
        ) : (
          <Paragraph theme="alt2">No comment left.</Paragraph>
        )}
        {review.createdAt ? (
          <Paragraph theme="alt2" size="$1">
            {formatReviewDate(review.createdAt)}
          </Paragraph>
        ) : null}
      </YStack>
    </Card>
  )
}

const StarRow = ({ rating }: { rating: number }) => {
  const { primaryColor } = useBrand()
  return (
    <XStack gap="$1" ai="center">
      {STAR_VALUES.map((value) => {
        const active = value <= rating
        return (
          <Star
            key={value}
            size={16}
            color={active ? primaryColor : '$color8'}
            fill={active ? primaryColor : 'transparent'}
          />
        )
      })}
    </XStack>
  )
}

const formatReviewDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
