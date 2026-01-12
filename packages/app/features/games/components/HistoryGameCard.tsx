import { useMemo } from 'react'

import { Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { ArrowRight } from '@tamagui/lucide-icons'
import { BRAND_COLORS } from 'app/constants/colors'
import type { GameListItem } from 'app/features/games/types'
import { useLink } from 'solito/link'
import { useRouter } from 'solito/router'

export const HistoryGameCard = ({ game }: { game: GameListItem }) => {
  const router = useRouter()
  const detailHref = `/games/${game.id}`
  const detailLink = useLink({ href: detailHref })
  const kickoff = useMemo(() => new Date(game.startTime), [game.startTime])
  const kickoffLabel = useMemo(() => formatHistoryKickoffLabel(kickoff), [kickoff])
  const rivalryLines = useMemo(() => buildRivalryLines(game), [game])
  const metaLabel = useMemo(() => buildMetaLabel(game), [game])

  const handleCardPress = () => {
    if (detailLink.onPress) {
      detailLink.onPress()
    } else {
      router.push(detailHref)
    }
  }

  return (
    <Card
      bordered
      bw={1}
      boc="$black1"
      br="$5"
      p="$4"
      gap="$2"
      {...detailLink}
      onPress={handleCardPress}
      hoverStyle={{ backgroundColor: '$color2' }}
      pressStyle={{ backgroundColor: '$color3' }}
      animation="slow"
      enterStyle={{ opacity: 0, y: 18 }}
    >
      <YStack gap="$1.5">
        <XStack ai="center" jc="space-between" gap="$2">
          <SizableText size="$6" fontWeight="700">
            {kickoffLabel}
          </SizableText>
          <ArrowRight size={18} />
        </XStack>
        {rivalryLines ? (
          <YStack gap="$1.5">
            <YStack h={2} w={36} br={999} bg={BRAND_COLORS.primary} />
            {rivalryLines.map((line, index) => (
              <ScoreLine key={`${line.name}-${index}`} {...line} />
            ))}
          </YStack>
        ) : null}
        {metaLabel ? (
          <Paragraph theme="alt2" size="$2">
            {metaLabel}
          </Paragraph>
        ) : null}
      </YStack>
    </Card>
  )
}

const buildRivalryLines = (game: GameListItem) => {
  const teams = game.teamCaptains ?? []
  if (teams.length < 2) return null
  const orderedTeams = [...teams].sort((a, b) => a.draftOrder - b.draftOrder)
  const result = game.result
  const hasScores = Boolean(
    result?.winnerScore != null &&
      result?.loserScore != null &&
      result?.winningTeamId &&
      result?.losingTeamId
  )
  const formatName = (name: string | null | undefined) => name ?? 'Captain'

  if (result?.winningTeamId && result?.losingTeamId) {
    const teamById = new Map(orderedTeams.map((team) => [team.id, team]))
    const winner = teamById.get(result.winningTeamId)
    const loser = teamById.get(result.losingTeamId)
    if (winner && loser) {
      return [
        {
          name: formatName(winner.captainName),
          score: hasScores ? result?.winnerScore : null,
          isWinner: true,
        },
        {
          name: formatName(loser.captainName),
          score: hasScores ? result?.loserScore : null,
          isWinner: false,
        },
      ]
    }
  }

  const left = orderedTeams[0]
  const right = orderedTeams[1]
  if (!left || !right) return null
  return [
    {
      name: formatName(left.captainName),
      score: null,
      isWinner: false,
    },
    {
      name: formatName(right.captainName),
      score: null,
      isWinner: false,
    },
  ]
}

const ScoreLine = ({
  name,
  score,
  isWinner,
}: {
  name: string
  score: number | null
  isWinner: boolean
}) => {
  const scoreLabel = score == null ? '-' : `${score}`
  const scoreColor = isWinner ? BRAND_COLORS.primary : '$color11'
  return (
    <XStack ai="center" gap="$2">
      <SizableText size="$5" fontWeight="700" color={scoreColor}>
        {scoreLabel}
      </SizableText>
      <SizableText size="$5" fontWeight="600">
        {name}
      </SizableText>
    </XStack>
  )
}

const buildMetaLabel = (game: GameListItem) => {
  const draftEnabled = game.draftModeEnabled === true
  const statusLabel =
    game.status === 'cancelled'
      ? 'Cancelled'
      : !draftEnabled
        ? 'Completed'
        : game.result?.status === 'confirmed'
          ? 'Final'
          : 'Result pending'
  const location = game.locationName ?? 'Venue TBD'
  return `${statusLabel} - ${location}`
}

const formatHistoryKickoffLabel = (date: Date) => {
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })
  const parts = formatter.formatToParts(date)
  const hour = parts.find((part) => part.type === 'hour')?.value ?? ''
  const minute = parts.find((part) => part.type === 'minute')?.value ?? ''
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? '')
    .toLowerCase()
    .replace(/\./g, '')
  const minuteLabel = minute === '00' ? '' : `:${minute}`
  const time = `${hour}${minuteLabel}${dayPeriod}`.replace(/\s+/g, '')
  return `${dateLabel} @ ${time}`
}
