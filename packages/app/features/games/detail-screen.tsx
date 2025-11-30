import {
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
  isWeb,
  useToastController,
} from '@my/ui'
import { ArrowRight, Calendar, Handshake, Heart, ShieldCheck, Zap } from '@tamagui/lucide-icons'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useRouter } from 'solito/router'
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { useLink } from 'solito/link'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useState, type ReactNode } from 'react'

import { AdminPanel, GameActionBar, RosterSection, StatusBadge } from './components'
import {
  deriveAvailabilityStatus,
  deriveUserBadge,
  deriveUserStateMessage,
  describeAvailability,
  describeUserBadge,
} from './status-helpers'
import { useGameDetailState } from './useGameDetailState'
import type { GameDetail } from './types'

const COMMUNITY_GUIDELINES = [
  {
    icon: Heart,
    title: 'Strictly vibes',
    description: 'Friends-of-friends footy night. Smile, dap, hype every nutmeg.',
  },
  {
    icon: Calendar,
    title: 'Show up early',
    description: 'Jog in before warmups so we can juggle, stretch, and pick sides together.',
  },
  {
    icon: ShieldCheck,
    title: 'Play clean',
    description: 'No slides, no wild studs—just tidy touches, fair calls, and control in every challenge.',
  },
  {
    icon: Zap,
    title: 'Win and it’s free',
    description: 'Keep score for pride, not pockets. Celebrate the win, dap the crew, line up the next run.',
  },
  {
    icon: Handshake,
    title: 'Protect the crew',
    description: 'Respect every invite. We keep this field by keeping the energy right.',
  },
] as const

export const GameDetailScreen = ({ gameId }: { gameId: string }) => {
  const { data, isLoading, error } = api.games.byId.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  )
  const router = useRouter()
  const toast = useToastController()
  const utils = api.useUtils()
  const { join, leave, confirmAttendance, pendingGameId, isPending, isConfirming } = useQueueActions()
  const { role, user } = useUser()
  const draftLink = useLink({ href: `/games/${gameId}/draft` })
  const [removingId, setRemovingId] = useState<string | null>(null)

  const removeMutation = api.queue.removeMember.useMutation({
    onSuccess: async ({ gameId }) => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Player removed')
    },
    onError: (err) => toast.show('Unable to remove player', { message: err.message }),
    onSettled: () => setRemovingId(null),
  })

  const view = useGameDetailState({
    game: data,
    userId: user?.id ?? null,
    queueState: { pendingGameId, isPending },
  })
  useGameRealtimeSync(data?.id)

  const canManage = !!data && role === 'admin'
  const availabilityStatus = data
    ? deriveAvailabilityStatus({
        status: data.status,
        confirmedCount: view.confirmedCount,
        capacity: data.capacity,
        attendanceConfirmedCount: view.confirmedPlayers.filter((player) => Boolean(player.attendanceConfirmedAt)).length,
      })
    : null
  const userStatusBadge = deriveUserBadge({
    queueStatus: view.userEntry?.status ?? 'none',
    attendanceConfirmed: Boolean(view.userEntry?.attendanceConfirmedAt),
  })
  const userStateMessage = deriveUserStateMessage({
    queueStatus: view.userEntry?.status ?? 'none',
    attendanceConfirmed: Boolean(view.userEntry?.attendanceConfirmedAt),
    waitlistFull: view.waitlistFull,
    canConfirmAttendance: view.canConfirmAttendance,
    confirmationWindowStart: view.confirmationWindowStart,
    gameStatus: data?.status ?? 'scheduled',
    spotsLeft: view.spotsLeft,
  })

  const handleCta = () => {
    if (!data) return
    if (view.ctaState === 'join') {
      join(data.id)
    } else {
      leave(data.id)
    }
  }

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (error || !data) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4">
        <Paragraph theme="alt2">We couldn’t load this game.</Paragraph>
        <Button onPress={() => router.push('/games')}>Back to games</Button>
      </YStack>
    )
  }

  return (
    <YStack f={1} bg="$background">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          ...screenContentContainerStyle,
          paddingBottom: isWeb
            ? screenContentContainerStyle.paddingBottom
            : (screenContentContainerStyle.paddingBottom ?? 0) + 96,
        }}
      >
        <YStack gap="$4">
          <GameHeader
            kickoffLabel={view.kickoffLabel}
            formattedStart={view.formattedStart}
            locationName={data.locationName}
            costCents={data.costCents}
            availabilityStatus={availabilityStatus}
            userStatusBadge={userStatusBadge}
          />

          <YStack gap="$2">
            {isWeb ? (
              <AttendanceCard
                message={userStateMessage}
                ctaLabel={view.ctaLabel}
                onCta={handleCta}
                disabled={view.ctaDisabled}
                theme={view.ctaTheme}
                isLoading={view.isGamePending}
                canConfirmAttendance={view.canConfirmAttendance}
                onConfirmAttendance={() => confirmAttendance(data.id)}
                confirmationWindowStart={view.confirmationWindowStart}
              />
            ) : null}
            {view.confirmedCount >= data.capacity ? (
              <DraftStatusCard draftStatus={data.draftStatus} canManage={canManage} draftLink={draftLink} />
            ) : null}
          </YStack>

          {canManage ? <AdminPanel game={data} /> : null}

          {shouldShowMatchSummary({ result: data.result, teams: data.teams ?? [], draftStatus: data.draftStatus, showEmptyState: canManage }) ? (
            <>
              <SectionTitle>Match summary</SectionTitle>
              <ResultSummary
                result={data.result}
                teams={data.teams ?? []}
                captains={data.captains}
                showEmptyState={canManage}
                draftStatus={data.draftStatus}
              />
            </>
          ) : null}

          <SectionTitle meta={`${view.confirmedCount}/${data.capacity}`}>Roster</SectionTitle>
          <RosterSection
            entries={view.confirmedPlayers}
            canManage={canManage}
            removingId={removingId}
            onRemovePlayer={(queueId) => {
              setRemovingId(queueId)
              removeMutation.mutate({ queueId })
            }}
          />

          <SectionTitle
            meta={
              view.waitlistCapacity
                ? `${view.waitlistedCount}/${view.waitlistCapacity}`
                : `${view.waitlistedCount}`
            }
          >
            Waitlist
          </SectionTitle>
          <RosterSection
            entries={view.waitlistedPlayers}
            emptyLabel="No one on the waitlist yet."
            canManage={canManage}
            removingId={removingId}
            onRemovePlayer={(queueId) => {
              setRemovingId(queueId)
              removeMutation.mutate({ queueId })
            }}
          />

          <SectionTitle>Community guidelines</SectionTitle>
          <CommunityGuidelinesSection />
        </YStack>
      </ScrollView>
      {!isWeb ? (
        <GameActionBar
          view={view}
          userStateMessage={userStateMessage}
          onCta={handleCta}
          onConfirmAttendance={() => confirmAttendance(data.id)}
          isConfirming={isConfirming}
        />
      ) : null}
    </YStack>
  )
}

const GameHeader = ({
  kickoffLabel,
  formattedStart,
  locationName,
  costCents,
  availabilityStatus,
  userStatusBadge,
}: {
  kickoffLabel: string
  formattedStart: string
  locationName?: string | null
  costCents: number | null
  availabilityStatus: ReturnType<typeof deriveAvailabilityStatus> | null
  userStatusBadge: ReturnType<typeof deriveUserBadge> | null
}) => {
  const meta = [formattedStart || 'Date to be announced', locationName ?? 'Venue TBD', formatCurrency(costCents)]
  return (
    <YStack gap="$1">
      <SizableText size="$7" fontWeight="700">
        {kickoffLabel || 'Kickoff TBD'}
      </SizableText>
      <YStack pt="$0.5" pb="$0.5">
        <CombinedStatusBadge availability={availabilityStatus} userBadge={userStatusBadge} />
      </YStack>
      <MetaRow items={meta} />
    </YStack>
  )
}

const AttendanceCard = ({
  message,
  ctaLabel,
  onCta,
  disabled,
  theme,
  isLoading,
  canConfirmAttendance,
  onConfirmAttendance,
  confirmationWindowStart,
}: {
  message: string
  ctaLabel: string
  onCta: () => void
  disabled: boolean
  theme?: string
  isLoading: boolean
  canConfirmAttendance: boolean
  onConfirmAttendance: () => void
  confirmationWindowStart: Date | null
}) => {
  const buttonTheme = theme === 'alt2' ? 'alt2' : undefined
  const isConfirmation = canConfirmAttendance && Boolean(confirmationWindowStart)
  const handler = isConfirmation ? onConfirmAttendance : onCta
  const label = isConfirmation ? 'Confirm attendance' : ctaLabel
  const detail =
    !isConfirmation && confirmationWindowStart
      ? `Confirmation opens ${confirmationWindowStart.toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })}`
      : null
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} px="$3" py="$2">
      <XStack ai="center" gap="$2" flexWrap="wrap">
        <YStack f={1} gap="$0.5">
          {message ? <Paragraph fontWeight="600">{message}</Paragraph> : null}
          {detail ? (
            <Paragraph theme="alt2" size="$2">
              {detail}
            </Paragraph>
          ) : null}
        </YStack>
        <Button
          theme={buttonTheme}
          disabled={disabled}
          iconAfter={isLoading ? <Spinner size="small" /> : undefined}
          onPress={handler}
        >
          {label}
        </Button>
      </XStack>
    </Card>
  )
}

const DraftStatusCard = ({
  draftStatus,
  canManage,
  draftLink,
}: {
  draftStatus: GameDetail['draftStatus']
  canManage: boolean
  draftLink: ReturnType<typeof useLink>
}) => {
  const content = getDraftStatusContent(draftStatus, canManage)
  return (
    <Card
      bordered
      $platform-native={{ borderWidth: 0 }}
      px="$3"
      py="$3"
      {...draftLink}
      onPress={(event) => {
        event?.stopPropagation?.()
        draftLink.onPress?.(event)
      }}
      pressStyle={{ backgroundColor: '$color2' }}
    >
      <YStack gap="$1.5">
        <XStack ai="center" jc="space-between" gap="$2">
          <SizableText fontWeight="600">{content.headline}</SizableText>
          <ArrowRight />
        </XStack>
        {content.subline ? (
          <Paragraph theme="alt2" size="$2">
            {content.subline}
          </Paragraph>
        ) : null}
        {content.note ? (
          <Paragraph theme="alt2" size="$2">
            {content.note}
          </Paragraph>
        ) : null}
        <Paragraph theme="alt2" size="$2">
          {content.hint}
        </Paragraph>
      </YStack>
    </Card>
  )
}

const getDraftStatusContent = (
  draftStatus: GameDetail['draftStatus'],
  canManage: boolean
): {
  headline: string
  subline?: string
  note?: string
  hint: string
} => {
  switch (draftStatus) {
    case 'in_progress':
      return {
        headline: canManage ? 'Draft is live' : 'Draft happening now',
        subline: undefined,
        note: canManage ? 'Keep picks moving until both rosters are full.' : undefined,
        hint: canManage ? 'Tap to manage draft' : 'Tap to watch live picks',
      }
    case 'completed':
      return {
        headline: 'Teams locked in',
        subline: 'Captains finished picking. Review the squads before kickoff.',
        hint: 'Tap to review teams',
      }
    case 'ready':
      return {
        headline: canManage ? 'Draft can start anytime' : 'Captains are ready',
        subline: canManage
          ? 'Open the draft room once everyone is on the field.'
          : 'Captains will start picking as soon as the room opens.',
        hint: canManage ? 'Tap to start draft' : 'Tap to preview room',
      }
    case 'pending':
    default:
      return {
        headline: canManage ? 'Pick captains to unlock drafting' : 'Captains coming soon',
        subline: canManage
          ? 'Choose two confirmed players so we can start picking.'
          : 'We’ll draft as soon as captains are announced.',
        hint: canManage ? 'Tap to set captains' : 'Captains coming soon',
      }
  }
}

const SectionTitle = ({ children, meta }: { children: string; meta?: string }) => (
  <XStack ai="center" jc="space-between" gap="$2">
    <Paragraph theme="alt1" fontWeight="600">
      {children}
    </Paragraph>
    {meta ? (
      <Paragraph theme="alt2" size="$2">
        {meta}
      </Paragraph>
    ) : null}
  </XStack>
)

const MetaRow = ({ items }: { items: (string | null | undefined)[] }) => {
  const filtered = items.filter((item): item is string => Boolean(item && item.trim()))
  if (!filtered.length) return null
  return (
    <XStack gap="$1" flexWrap="wrap" ai="center">
      {filtered.map((text, index) => (
        <XStack key={`${text}-${index}`} ai="center" gap="$1">
          {index > 0 ? (
            <Paragraph theme="alt2" size="$2">
              •
            </Paragraph>
          ) : null}
          <Paragraph theme="alt2" size="$2">
            {text}
          </Paragraph>
        </XStack>
      ))}
    </XStack>
  )
}

const CombinedStatusBadge = ({
  availability,
  userBadge,
}: {
  availability: ReturnType<typeof deriveAvailabilityStatus> | null
  userBadge: ReturnType<typeof deriveUserBadge> | null
}) => {
  if (!availability && !userBadge) return null

  const tone = availability?.tone ?? userBadge?.tone ?? 'neutral'
  const labelParts = [describeAvailability(availability), describeUserBadge(userBadge)].filter(Boolean)
  const label = labelParts.join(' · ')

  return (
    <XStack>
      <StatusBadge tone={tone} showIcon>
        {label}
      </StatusBadge>
    </XStack>
  )
}

const shouldShowMatchSummary = ({
  result,
  teams,
  draftStatus,
  showEmptyState,
}: {
  result: GameDetail['result']
  teams: GameDetail['teams']
  draftStatus: GameDetail['draftStatus']
  showEmptyState: boolean
}) => {
  if (result) return true
  const hasTeams = teams.length > 0 && teams.some((team) => (team.members ?? []).length > 0)
  if (draftStatus !== 'pending' && hasTeams) return true
  return showEmptyState
}

const ResultSummary = ({
  result,
  teams,
  captains,
  showEmptyState,
  draftStatus,
}: {
  result: GameDetail['result']
  teams: GameDetail['teams']
  captains: GameDetail['captains']
  showEmptyState?: boolean
  draftStatus: GameDetail['draftStatus']
}) => {
  const hasTeams = teams.length > 0 && teams.some((team) => (team.members ?? []).length > 0)
  const showTeamsWithoutResult = !result && draftStatus !== 'pending' && hasTeams
  if (!result && !showTeamsWithoutResult && !showEmptyState) return null

  const captainNameById = new Map(
    captains.map((captain) => [captain.profileId, captain.player.name ?? 'Captain'])
  )
  const pending = Boolean(result && result.status !== 'confirmed')
  const decoratedTeams = teams.map((team) => {
    const variant: ResultTeamVariant =
      result?.winningTeamId === team.id
        ? 'winner'
        : result?.losingTeamId === team.id
          ? 'loser'
          : 'neutral'
    const score =
      result?.winningTeamId === team.id
        ? result?.winnerScore
        : result?.losingTeamId === team.id
          ? result?.loserScore
          : null
    const captainProfileId = team.captainProfileId ?? null
    const captainName = captainProfileId ? captainNameById.get(captainProfileId) ?? null : null
    return { team, variant, score, captainName, captainProfileId }
  })

  const introText = result
    ? pending
      ? 'Awaiting confirmation.'
      : 'Result confirmed.'
    : draftStatus === 'completed'
      ? 'Teams are locked in. See who you’re running with.'
      : null

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} px="$3" py="$2" gap="$2">
      {introText ? <Paragraph theme="alt2">{introText}</Paragraph> : null}
      {decoratedTeams.length ? (
        <YStack gap="$2">
          {decoratedTeams.map(({ team, variant, score, captainName, captainProfileId }) => (
            <ResultTeamSection
              key={team.id}
              team={team}
              variant={result ? variant : 'neutral'}
              captainName={captainName}
              score={result ? score : null}
              captainProfileId={captainProfileId}
            />
          ))}
        </YStack>
      ) : (
        <Paragraph theme="alt2">Teams not finalized yet.</Paragraph>
      )}
      {!result && draftStatus !== 'completed' ? (
        <Paragraph theme="alt2" size="$2">
          Captains are drafting—teams update live.
        </Paragraph>
      ) : null}
    </Card>
  )
}

type ResultTeamVariant = 'winner' | 'loser' | 'neutral'

const ResultTeamSection = ({
  team,
  variant,
  captainName,
  captainProfileId,
  score,
}: {
  team: GameDetail['teams'][number]
  variant: ResultTeamVariant
  captainName?: string | null
  captainProfileId?: string | null
  score?: number | null
}) => (
  <YStack borderWidth={1} borderColor="$color4" br="$5" p="$2" gap="$1.5">
    <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
      <YStack gap="$0.5">
        <Paragraph theme="alt2">
          {variant === 'winner' ? 'Winner' : variant === 'loser' ? 'Loser' : 'Team'}
        </Paragraph>
        <Paragraph fontWeight="600">{team.name}</Paragraph>
      </YStack>
      <YStack ai="flex-end">
        {variant === 'winner' ? <StatusBadge tone="success">Winner</StatusBadge> : null}
        {score != null ? <Paragraph theme="alt1">Score {score}</Paragraph> : null}
      </YStack>
    </XStack>
    <YStack gap="$1">
      {captainName ? (
        <Paragraph theme="alt1" fontWeight="600">
          {captainName} (Captain)
        </Paragraph>
      ) : null}
      {(team.members ?? [])
        .filter((member) =>
          captainProfileId ? member.profileId !== captainProfileId : true
        )
        .map((member) => (
          <Paragraph key={member.profileId} theme="alt2" size="$2">
            {member.player.name ?? 'Anonymous Player'}
          </Paragraph>
        ))}
    </YStack>
  </YStack>
)

const CommunityGuidelinesSection = () => (
  <Card bordered $platform-native={{ borderWidth: 0 }} px="$3" py="$2">
    <YStack gap="$3">
      {COMMUNITY_GUIDELINES.map(({ icon: Icon, title, description }) => {
        const GuidelineIcon = Icon ?? Heart
        return (
          <XStack key={title} ai="flex-start" gap="$2" $gtSm={{ ai: 'center' }}>
            <IconBadge>
              <GuidelineIcon size={16} />
            </IconBadge>
            <YStack gap="$0.25" flex={1} minWidth={0}>
              <Paragraph fontWeight="600">{title}</Paragraph>
              <Paragraph theme="alt2" size="$2">
                {description}
              </Paragraph>
            </YStack>
          </XStack>
        )
      })}
    </YStack>
  </Card>
)

const IconBadge = ({ children }: { children: ReactNode }) => (
  <XStack
    w={32}
    h={32}
    flexShrink={0}
    ai="center"
    jc="center"
    br="$10"
    bg="$color2"
    borderWidth={1}
    borderColor="$color4"
  >
    {children}
  </XStack>
)

const formatCurrency = (cents: number | null) => {
  if (!Number.isFinite(cents ?? Number.NaN) || !cents || cents <= 0) return 'Free'
  return `$${((cents ?? 0) / 100).toFixed(2)}`
}
