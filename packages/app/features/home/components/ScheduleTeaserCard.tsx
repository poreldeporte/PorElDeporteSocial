import { AnimatePresence, Card, Paragraph, SizableText, XStack } from '@my/ui/public'
import { ArrowRight, Calendar, Trophy, Volleyball } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/router'

type Props = {
  gameId?: string
  variant?: 'schedule' | 'draft'
  title: string
  description: string
}

export const ScheduleTeaserCard = ({ gameId, variant = 'schedule', title, description }: Props) => {
  const router = useRouter()
  const icon = variant === 'draft' ? Trophy : Calendar
  const href =
    variant === 'draft'
      ? gameId
        ? `/games/${gameId}/draft`
        : '/games'
      : gameId
        ? `/games/${gameId}`
        : '/games'
  const Icon = icon
  return (
    <AnimatePresence>
      <Card
        key={`${variant}-${title}`}
        px="$4"
        py="$4"
        bordered
        $platform-native={{ borderWidth: 0 }}
        gap="$2"
        pressStyle={{ opacity: 0.85 }}
        hoverStyle={{ opacity: 0.95 }}
        onPress={() => router.push(href)}
        animation="slow"
        enterStyle={{ opacity: 0, y: 20 }}
      >
        <XStack ai="center" gap="$2" jc="space-between">
          <XStack ai="center" gap="$2">
            <Icon size={18} />
            <SizableText size="$5" fontWeight="600">
              {title}
            </SizableText>
          </XStack>
          <ArrowRight size={20} />
        </XStack>
        <Paragraph theme="alt2">{description}</Paragraph>
      </Card>
    </AnimatePresence>
  )
}
