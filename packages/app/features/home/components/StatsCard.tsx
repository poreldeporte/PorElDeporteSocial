import { AnimatePresence, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { useAppRouter } from 'app/utils/useAppRouter'

type StatsCardProps = {
  stats: { wins: number; losses: number; games: number }
  isLoading: boolean
}

export const StatsCard = ({ stats, isLoading }: StatsCardProps) => {
  const router = useAppRouter()
  return (
    <YStack gap="$1.5">
      <StatsCardBody stats={stats} isLoading={isLoading} />
    </YStack>
  )
}

const StatsCardBody = ({ stats, isLoading }: StatsCardProps) => {
  const router = useAppRouter()
  return (
    <Card
      px="$4"
      py="$4"
      bordered
      bw={1}
      boc="$color12"
      br="$5"
      onPress={() => router.push('/profile')}
      pressStyle={{ opacity: 0.9 }}
    >
      <YStack gap="$2">
        <Paragraph theme="alt2" size="$1" textAlign="center">
          All time
        </Paragraph>
        <XStack gap="$4">
          <StatBlock label="Games" value={stats.games} loading={isLoading} />
          <StatBlock label="Wins" value={stats.wins} loading={isLoading} />
          <StatBlock label="Losses" value={stats.losses} loading={isLoading} />
        </XStack>
      </YStack>
    </Card>
  )
}

const StatBlock = ({ label, value, loading }: { label: string; value: number; loading: boolean }) => (
  <YStack flex={1} ai="center" gap="$1">
    <AnimatePresence>
      <SizableText
        key={`${label}-${loading ? 'loading' : value}`}
        size="$6"
        fontWeight="700"
        animation="slow"
        enterStyle={{ opacity: 0, scale: 0.85, y: 10 }}
      >
        {loading ? '—' : value}
      </SizableText>
    </AnimatePresence>
    <Paragraph theme="alt2">{label}</Paragraph>
  </YStack>
)
