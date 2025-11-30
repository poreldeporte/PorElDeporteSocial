import { AnimatePresence, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui'

type StatsCardProps = {
  stats: { wins: number; losses: number; games: number }
  isLoading: boolean
}

export const StatsCard = ({ stats, isLoading }: StatsCardProps) => (
  <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
    <SizableText size="$5" fontWeight="600">
      My record
    </SizableText>
    <XStack gap="$4" mt="$3">
      <StatBlock label="Wins" value={stats.wins} loading={isLoading} />
      <StatBlock label="Losses" value={stats.losses} loading={isLoading} />
      <StatBlock label="Games" value={stats.games} loading={isLoading} />
    </XStack>
  </Card>
)

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
