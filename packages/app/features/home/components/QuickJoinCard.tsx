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
  onConfirmAttendance?: (gameId: string) => void
  isPending?: boolean
  pendingGameId?: string | null
  isConfirming?: boolean
}

export const QuickJoinCard = ({
  game,
  variant = 'schedule',
  titleOverride,
  onJoin,
  onLeave,
  onConfirmAttendance,
  isPending,
  pendingGameId,
  isConfirming,
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
  const isDraftReady = isDraftCard && game?.draftStatus === 'ready'
  const shouldShowDraftCard = isDraftCard && (isDraftLive || isDraftReady)

  if (isDraftCard && !shouldShowDraftCard) return null
  if (game && !isDraftCard) {
    const card = (
      <GameCard
        game={game}
        onJoin={onJoin ?? (() => {})}
        onLeave={onLeave ?? (() => {})}
        onConfirmAttendance={onConfirmAttendance}
        isPending={Boolean(isPending && pendingGameId && game.id === pendingGameId)}
        isConfirming={isConfirming}
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

  const description = game
    ? isDraftCard
      ? ''
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
            : isDraftReady
              ? 'Draft starting now'
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
