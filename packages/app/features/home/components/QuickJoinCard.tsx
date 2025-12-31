import { Paragraph, SizableText, YStack } from '@my/ui/public'
import { useMemo } from 'react'

import type { GameListItem } from 'app/features/games/types'
import { ScheduleTeaserCard } from './ScheduleTeaserCard'
import { GameCard } from './game-card'
import { formatGameKickoffLabel } from 'app/features/games/time-utils'

type QuickJoinCardProps = {
  game?: GameListItem | null
  variant?: 'schedule' | 'draft'
  titleOverride?: string
  onJoin?: (gameId: string) => void
  onLeave?: (gameId: string) => void
  isPending?: boolean
  pendingGameId?: string | null
}

export const QuickJoinCard = ({
  game,
  variant = 'schedule',
  titleOverride,
  onJoin,
  onLeave,
  isPending,
  pendingGameId,
}: QuickJoinCardProps) => {
  const kickoff = useMemo(() => (game ? new Date(game.startTime) : null), [game?.startTime])
  const timeLabel = kickoff
    ? kickoff.toLocaleString(undefined, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null
  const kickoffLabel = kickoff ? formatGameKickoffLabel(kickoff) : null

  const isDraftCard = variant === 'draft' && Boolean(game)
  const isDraftLive = isDraftCard && game?.draftStatus === 'in_progress'

  if (isDraftCard && !isDraftLive) return null
  if (game && !isDraftCard) {
    const card = (
      <GameCard
        game={game}
        onJoin={onJoin ?? (() => {})}
        onLeave={onLeave ?? (() => {})}
        isPending={Boolean(isPending && pendingGameId && game.id === pendingGameId)}
      />
    )
    return titleOverride ? (
      <YStack gap="$1.5">
        <SizableText size="$5" fontWeight="600">
          {titleOverride}
        </SizableText>
        {card}
      </YStack>
    ) : (
      card
    )
  }

  const draftDescription = game && isDraftCard
    ? `Don't miss the draft. Matchups drop for ${kickoffLabel ?? 'this run'}.`
    : "Don't miss out on the draft. Make sure to tune in and see the matchups."
  const description = game
    ? isDraftCard
      ? draftDescription
      : ''
    : 'No open runs right now—check the schedule to find your next run.'
  const meta =
    game && !isDraftCard
      ? [
          timeLabel ? timeLabel : null,
          game.locationName ? game.locationName : null,
        ].filter(Boolean)
      : game && isDraftCard
        ? [kickoffLabel, game.locationName ?? null].filter(Boolean)
        : []

  return (
    <ScheduleTeaserCard
      gameId={game?.id}
      variant={isDraftCard ? 'draft' : 'schedule'}
      title={
        titleOverride ??
        (isDraftCard
          ? isDraftLive
            ? 'Draft is happening now'
            : 'Draft room'
          : game
            ? 'Next kickoff'
            : 'Schedule')
      }
      description={description}
      badgeContent={null}
      meta={meta}
      ctaLabel={isDraftCard ? undefined : game ? undefined : 'See schedule'}
      liveIndicator={isDraftLive}
      showArrow={isDraftCard}
    />
  )
}
