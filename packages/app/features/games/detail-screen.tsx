import {
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  Separator,
  XStack,
  YStack,
  isWeb,
  useToastController,
} from '@my/ui/public'
import {
  ArrowRight,
  Calendar,
  Handshake,
  Heart,
  ShieldCheck,
  Zap,
} from '@tamagui/lucide-icons'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useRouter } from 'solito/router'
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { useLink } from 'solito/link'
import { useState, type ReactNode } from 'react'

import { AdminPanel, CombinedStatusBadge, GameActionBar, RosterSection } from './components'
import { deriveCombinedStatus, deriveUserStateMessage } from './status-helpers'
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
  const combinedStatus = data
    ? deriveCombinedStatus({
        gameStatus: data.status,
        confirmedCount: view.confirmedCount,
        capacity: data.capacity,
        attendanceConfirmedCount: view.confirmedPlayers.filter((player) => Boolean(player.attendanceConfirmedAt)).length,
        waitlistedCount: view.waitlistedCount,
        waitlistCapacity: view.waitlistCapacity,
        userStatus: view.userEntry?.status ?? 'none',
        attendanceConfirmed: Boolean(view.userEntry?.attendanceConfirmedAt),
        canConfirmAttendance: view.canConfirmAttendance,
      })
    : null
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
        <YStack gap="$3">
          <GameHeader
            kickoffLabel={view.kickoffLabel}
            locationName={data.locationName}
            status={combinedStatus}
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
            {view.confirmedCount >= data.capacity && data.draftStatus !== 'completed' ? (
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

          <SectionTitle>Waitlist</SectionTitle>
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
  locationName,
  status,
}: {
  kickoffLabel: string
  locationName?: string | null
  status: ReturnType<typeof deriveCombinedStatus>
}) => {
  return (
    <YStack gap="$2">
      <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
        <SizableText size="$6" fontWeight="600">
          {kickoffLabel || 'Kickoff TBD'}
        </SizableText>
        <CombinedStatusBadge status={status} />
      </XStack>
      <Paragraph>{locationName ?? 'Venue TBD'}</Paragraph>
      <Separator my="$1" />
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
  const label = isConfirmation ? 'Confirm spot' : ctaLabel
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
    <SizableText size="$5" fontWeight="600">
      {children}
    </SizableText>
    {meta ? (
      <Paragraph theme="alt2" size="$2">
        {meta}
      </Paragraph>
    ) : null}
  </XStack>
)

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

  const introText =
    draftStatus === 'in_progress'
      ? 'Captains are drafting—teams update live.'
      : result && pending
        ? 'Awaiting confirmation.'
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
}) => {
  const tone =
    variant === 'winner'
      ? {
          borderColor: '$green7',
          bg: '$green2',
          scoreColor: '$green11',
          chipBg: '$green3',
          chipBorder: '$green7',
          chipText: '$green11',
          chipBadgeBg: '$green9',
        }
      : variant === 'loser'
        ? {
            borderColor: '$color4',
            bg: '$color1',
            scoreColor: '$color12',
            chipBg: '$color2',
            chipBorder: '$color5',
            chipText: '$color12',
            chipBadgeBg: '$color8',
          }
        : {
            borderColor: '$color4',
            bg: '$color1',
            scoreColor: '$color11',
            chipBg: '$color2',
            chipBorder: '$color5',
            chipText: '$color11',
            chipBadgeBg: '$color8',
          }

  const roster =
    (team.members ?? []).map((member) => ({
      member,
      isCaptain: captainProfileId ? member.profileId === captainProfileId : false,
    })) ?? []

  return (
    <YStack borderWidth={1} borderColor={tone.borderColor as any} br="$4" p="$2" gap="$1.5" bg={tone.bg as any}>
      <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
        <SizableText size="$7" fontWeight="800" color={tone.scoreColor as any}>
          {team.name}
        </SizableText>
        {score != null ? (
          <SizableText size="$9" fontWeight="900" color={tone.scoreColor as any}>
            {score}
          </SizableText>
        ) : null}
      </XStack>
      <XStack gap="$1" flexWrap="wrap">
        {roster.map(({ member, isCaptain }) => {
          const name = member.player.name ?? (isCaptain && captainName ? captainName : 'Anonymous Player')
          return (
            <XStack
              key={member.profileId ?? member.player.id}
              ai="center"
              gap="$1"
              px="$2"
              py="$1"
              br="$3"
              bg={tone.chipBg as any}
              borderWidth={1}
              borderColor={tone.chipBorder as any}
            >
              {isCaptain ? (
                <XStack
                  w={18}
                  h={18}
                  ai="center"
                  jc="center"
                  br="$10"
                  bg={tone.chipBadgeBg as any}
                  flexShrink={0}
                >
                  <SizableText size="$1" color="$color1" fontWeight="700">
                    C
                  </SizableText>
                </XStack>
              ) : null}
              <Paragraph size="$2" fontWeight={isCaptain ? '700' : '600'} color={tone.chipText as any}>
                {name}
              </Paragraph>
            </XStack>
          )
        })}
      </XStack>
    </YStack>
  )
}

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
