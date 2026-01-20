import { Paragraph, SizableText, XStack, YStack } from '@my/ui/public'

import { BRAND_COLORS } from 'app/constants/colors'

type RatingBlockProps = {
  rating?: number
  ratedGames?: number
}

export const RatingBlock = ({ rating, ratedGames }: RatingBlockProps) => {
  const safeRating = Math.max(0, rating ?? 1500)
  const roundedRating = Math.round(safeRating)
  const filled = Math.min(3, Math.max(0, ratedGames ?? 0))
  const showRating = (ratedGames ?? 0) >= 3
  const dotSize = 14
  const emptyDotColor = '$color6'
  const progressLabel = `${filled}/3`

  return (
    <YStack ai="flex-end" gap="$1">
      {showRating ? (
        <SizableText size="$4" fontWeight="700">
          {roundedRating}
        </SizableText>
      ) : (
        <XStack
          gap="$1.5"
          ai="center"
          h={22}
          accessibilityRole="text"
          accessibilityLabel={progressLabel}
        >
          <SizableText size="$4" fontWeight="700">
            {progressLabel}
          </SizableText>
          {Array.from({ length: 3 }).map((_, index) => (
            <YStack
              key={`rating-dot-${index}`}
              w={dotSize}
              h={dotSize}
              br={999}
              bg={index < filled ? BRAND_COLORS.primary : emptyDotColor}
            />
          ))}
        </XStack>
      )}
      <Paragraph theme="alt2" size="$2">
        {showRating ? 'Rating' : 'Games for rating'}
      </Paragraph>
    </YStack>
  )
}
