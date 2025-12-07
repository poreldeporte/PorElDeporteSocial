import { Button, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { Calendar } from '@tamagui/lucide-icons'
import { useLink } from 'solito/link'

export const SchedulePreviewCard = () => {
  const link = useLink({ href: '/games' })
  return (
    <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
      <YStack gap="$2">
        <XStack ai="center" gap="$2">
          <Calendar size={18} />
          <SizableText size="$5" fontWeight="600">
            Upcoming schedule
          </SizableText>
        </XStack>
        <Paragraph theme="alt2">See the full slate of drop-ins and secure your spot.</Paragraph>
        <Button {...link} br="$10" alignSelf="flex-start">
          View schedule
        </Button>
      </YStack>
    </Card>
  )
}
