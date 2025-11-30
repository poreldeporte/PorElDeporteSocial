import { useMemo } from 'react'

import type { GameListItem } from 'app/features/games/types'
import {
  deriveAvailabilityStatus,
  deriveUserBadge,
  describeAvailability,
  describeUserBadge,
} from 'app/features/games/status-helpers'
import { ScheduleTeaserCard } from './ScheduleTeaserCard'

type QuickJoinCardProps = {
  game?: GameListItem | null
  variant?: 'schedule' | 'draft'
}

export const QuickJoinCard = ({ game, variant = 'schedule' }: QuickJoinCardProps) => {
  const kickoff = useMemo(() => (game ? new Date(game.startTime) : null), [game?.startTime])
  const timeLabel = kickoff
    ? kickoff.toLocaleString(undefined, {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  const availability = game
    ? deriveAvailabilityStatus({
        status: game.status,
        confirmedCount: game.confirmedCount,
        capacity: game.capacity,
        attendanceConfirmedCount: game.attendanceConfirmedCount ?? 0,
        waitlistedCount: game.waitlistedCount ?? 0,
        waitlistCapacity: game.waitlistCapacity ?? 0,
      })
    : null
  const userBadge = game
    ? deriveUserBadge({
        queueStatus: game.userStatus === 'none' ? undefined : game.userStatus,
      })
    : null

  const statusLine = [describeAvailability(availability), describeUserBadge(userBadge)]
    .filter(Boolean)
    .join(' · ')

  const isDraftCard = variant === 'draft' && Boolean(game)
  const description = game
    ? isDraftCard
      ? 'Captains are drafting live. Tap to follow every pick.'
      : [statusLine, timeLabel ? `${timeLabel} @ ${game.locationName ?? 'Location TBA'}` : null]
          .filter(Boolean)
          .join(' · ')
    : isDraftCard
      ? 'No drafts live—check back once rosters fill.'
      : 'No open runs right now—check the schedule to find your next run.'
  return (
    <ScheduleTeaserCard
      gameId={game?.id}
      variant={isDraftCard ? 'draft' : 'schedule'}
      title={
        isDraftCard
          ? game
            ? 'Draft room'
            : 'Draft room'
          : game
            ? 'Next kickoff'
            : 'Schedule'
      }
      description={description}
    />
  )
}
