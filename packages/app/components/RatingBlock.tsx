import { Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { useBrand } from 'app/provider/brand'

type RatingBlockProps = {
  rating?: number
  ratedGames?: number
  align?: 'start' | 'center' | 'end'
  showLabel?: boolean
  insideLabel?: string | null
  textColor?: string
  accentColor?: string
}

export const RatingBlock = ({
  rating,
  ratedGames,
  align = 'end',
  showLabel = true,
  insideLabel = null,
  textColor,
  accentColor,
}: RatingBlockProps) => {
  const { primaryColor } = useBrand()
  const safeRating = Math.max(0, rating ?? 1500)
  const roundedRating = Math.round(safeRating)
  const filled = Math.min(3, Math.max(0, ratedGames ?? 0))
  const showRating = (ratedGames ?? 0) >= 3
  const dotSize = 14
  const emptyDotColor = '$color6'
  const filledDotColor = accentColor ?? primaryColor
  const progressLabel = `${filled}/3`
  const alignItems =
    align === 'center' ? 'center' : align === 'start' ? 'flex-start' : 'flex-end'

  return (
    <YStack ai={alignItems} gap="$1">
      {showRating ? (
        <SizableText size="$4" fontWeight="700" color={textColor}>
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
          <SizableText size="$4" fontWeight="700" color={textColor}>
            {progressLabel}
          </SizableText>
          {Array.from({ length: 3 }).map((_, index) => (
            <YStack
              key={`rating-dot-${index}`}
              w={dotSize}
              h={dotSize}
              br={999}
              bg={index < filled ? filledDotColor : emptyDotColor}
            />
          ))}
        </XStack>
      )}
      {insideLabel ? (
        <Paragraph
          size="$1"
          textTransform="uppercase"
          letterSpacing={1.4}
          theme="alt2"
          color={textColor}
        >
          {insideLabel}
        </Paragraph>
      ) : null}
      {showLabel ? (
        <Paragraph theme="alt2" size="$2">
          {showRating ? 'Rating' : 'Games for rating'}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
