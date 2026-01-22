import { Paragraph, XStack, YStack } from '@my/ui/public'
import { useBrand } from 'app/provider/brand'

type RecentFormChipsProps = {
  recentForm: string[]
  label?: string
  max?: number
}

const normalizeResult = (result: string) => (result.toUpperCase() === 'W' ? 'W' : 'L')

export const RecentFormChips = ({ recentForm, label, max = 5 }: RecentFormChipsProps) => {
  const { primaryColor } = useBrand()
  const results = recentForm.filter(Boolean).slice(0, max).reverse()
  if (!results.length) return null
  return (
    <YStack gap="$1" mt="$1">
      <XStack gap="$1.5" ai="center" flexWrap="wrap">
        {label ? (
          <Paragraph theme="alt2" size="$2">
            {label}
          </Paragraph>
        ) : null}
        {results.map((result, index) => (
          <FormChip
            key={`${result}-${index}`}
            result={normalizeResult(result)}
            primaryColor={primaryColor}
          />
        ))}
      </XStack>
    </YStack>
  )
}

const FormChip = ({ result, primaryColor }: { result: string; primaryColor: string }) => {
  const tone = result === 'W' ? primaryColor : '$color5'
  return (
    <YStack
      px="$1.5"
      py="$0.5"
      br="$10"
      backgroundColor={tone}
      borderColor="$color4"
      borderWidth={1}
      minWidth={28}
      ai="center"
    >
      <Paragraph size="$2" fontWeight="700">
        {result}
      </Paragraph>
    </YStack>
  )
}
