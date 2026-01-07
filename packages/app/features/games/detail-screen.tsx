import type { ScrollViewProps } from 'react-native'
import { useState, type ReactNode } from 'react'

import {
  Button,
  Card,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
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
import { BRAND_COLORS } from 'app/constants/colors'
import { api } from 'app/utils/api'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useRouter } from 'solito/router'
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { useLink } from 'solito/link'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { getDockSpacer } from 'app/constants/dock'

import { AdminPanel, CombinedStatusBadge, GameActionBar, RosterSection } from './components'
import { getGameCtaIcon, type GameCtaState } from './cta-icons'
import { deriveCombinedStatus, deriveUserStateMessage, getConfirmCountdownLabel } from './status-helpers'
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
    description: 'Arrive 15 minutes before kickoff so we can warm up and set teams.',
  },
  {
    icon: ShieldCheck,
    title: 'Play clean',
    description: 'No slides, no malicious tackles—respect first, always.',
  },
  {
    icon: ShieldCheck,
    title: 'No cleats',
    description: 'Turf shoes only. It keeps every player safe.',
  },
  {
    icon: Zap,
    title: 'Win and it’s free',
    description: 'Teams stake the field fee; the losing side covers both. Compete hard, stay friendly.',
  },
  {
    icon: Handshake,
    title: 'Respect the roster',
    description: 'Only claim a spot if you can play, and update your status early.',
  },
  {
    icon: ShieldCheck,
    title: 'No-shows cover the field fee',
    description: 'No-shows disrupt the crew. If you don’t communicate, you cover the full field fee.',
  },
] as const

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GameDetailScreen = ({
  gameId,
  scrollProps,
  headerSpacer,
  topInset,
}: { gameId: string } & ScrollHeaderProps) => {
  const { data, isLoading, error } = api.games.byId.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  )
  const router = useRouter()
  const toast = useToastController()
  const utils = api.useUtils()
  const { join, leave, confirmAttendance, pendingGameId, isPending, isConfirming } = useQueueActions()
  const { role, user } = useUser()
  const insets = useSafeAreaInsets()
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
  const confirmCountdownLabel = data
    ? getConfirmCountdownLabel({
        confirmationWindowStart: view.confirmationWindowStart,
        isConfirmationOpen: view.isConfirmationOpen,
        userStatus: view.userEntry?.status ?? data.userStatus ?? 'none',
        attendanceConfirmedAt: view.userEntry?.attendanceConfirmedAt ?? null,
        gameStatus: data.status,
      })
    : null
  const displayStatus =
    confirmCountdownLabel && combinedStatus
      ? { ...combinedStatus, label: confirmCountdownLabel }
      : combinedStatus
  const userStateMessage = deriveUserStateMessage({
    queueStatus: view.userEntry?.status ?? 'none',
    attendanceConfirmed: Boolean(view.userEntry?.attendanceConfirmedAt),
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
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (error || !data) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">We couldn’t load this game.</Paragraph>
        <Button onPress={() => router.push('/games')}>Back to games</Button>
      </YStack>
    )
  }

  const showActionBar = !isWeb
  const basePaddingBottom = screenContentContainerStyle.paddingBottom ?? 0
  const actionBarSpacer = showActionBar ? getDockSpacer(insets.bottom) : 0
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = {
    ...screenContentContainerStyle,
    paddingTop: headerSpacer ? 0 : screenContentContainerStyle.paddingTop,
    paddingBottom: basePaddingBottom,
  }
  const mergedContentStyle = Array.isArray(contentContainerStyle)
    ? [baseContentStyle, ...contentContainerStyle]
    : [baseContentStyle, contentContainerStyle]

  return (
    <YStack f={1} bg="$background">
      <ScrollView
        style={{ flex: 1 }}
        {...scrollViewProps}
        contentContainerStyle={mergedContentStyle}
      >
        {headerSpacer}
        <YStack gap="$3">
          <GameHeader kickoffLabel={view.kickoffLabel} locationName={data.locationName} status={displayStatus} />

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
            {data.draftStatus !== 'completed' &&
            (view.confirmedCount >= data.capacity || data.draftStatus !== 'pending') ? (
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
        <YStack h={actionBarSpacer} />
      </ScrollView>
      {showActionBar ? (
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
        <SizableText size="$7" fontWeight="700">
          {kickoffLabel || 'Kickoff TBD'}
        </SizableText>
        <CombinedStatusBadge status={status} />
      </XStack>
      <Paragraph fontWeight="600">{locationName ?? 'Venue TBD'}</Paragraph>
      <Paragraph theme="alt2" size="$2">
        Arrive 15 minutes early to warm up.
      </Paragraph>
      <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
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
  const isRateCta = ctaLabel === 'Rate the game'
  const isConfirmation = canConfirmAttendance && Boolean(confirmationWindowStart)
  const isJoinWaitlist = ctaLabel === 'Join waitlist'
  const isClaimCta = !isConfirmation && (ctaLabel === 'Claim spot' || isJoinWaitlist)
  const ctaState: GameCtaState | undefined =
    ctaLabel === 'Drop out'
      ? 'leave-confirmed'
      : ctaLabel === 'Leave waitlist'
        ? 'leave-waitlisted'
        : ctaLabel === 'Claim spot' || ctaLabel === 'Join waitlist'
          ? 'join'
          : undefined
  const icon = getGameCtaIcon({
    isPending: isLoading,
    showConfirm: isConfirmation,
    isRate: isRateCta,
    ctaState,
  })
  const buttonTheme =
    isRateCta || isClaimCta || isConfirmation
      ? undefined
      : theme === 'alt2'
        ? 'alt2'
        : undefined
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
          icon={icon}
          backgroundColor={
            isRateCta
              ? '$color'
              : isConfirmation
                ? BRAND_COLORS.primary
                : isClaimCta
                  ? 'transparent'
                  : undefined
          }
          borderColor={
            isRateCta
              ? '$color'
              : isConfirmation
                ? BRAND_COLORS.primary
                : isClaimCta
                  ? BRAND_COLORS.primary
                  : undefined
          }
          color={isRateCta ? '$background' : isClaimCta ? BRAND_COLORS.primary : undefined}
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
        headline: canManage ? 'Captains set' : 'Draft starting now',
        subline: canManage ? 'Draft is about to start.' : 'Captains are ready to pick.',
        hint: 'Tap to enter the draft room',
      }
    case 'pending':
    default:
      return {
        headline: canManage ? 'Pick captains to unlock drafting' : 'Captains coming soon',
        subline: canManage
          ? 'Choose confirmed captains so we can start picking.'
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

  const isMultiTeam = teams.length > 2
  const captainNameById = new Map(
    captains.map((captain) => [captain.profileId, captain.player.name ?? 'Captain'])
  )
  const pending = Boolean(result && result.status !== 'confirmed')
  const decoratedTeams = teams.map((team) => {
    const isWinner = result?.winningTeamId === team.id
    const isLoser = result ? (isMultiTeam ? !isWinner : result?.losingTeamId === team.id) : false
    const variant: ResultTeamVariant = isWinner ? 'winner' : result && isLoser ? 'loser' : 'neutral'
    const score = result && !isMultiTeam
      ? isWinner
        ? result?.winnerScore
        : result?.losingTeamId === team.id
          ? result?.loserScore
          : null
      : null
    const captainProfileId = team.captainProfileId ?? null
    const captainName = captainProfileId ? captainNameById.get(captainProfileId) ?? null : null
    return { team, variant, score, captainName, captainProfileId }
  })

  const introText =
    draftStatus === 'in_progress'
      ? 'Captains are drafting—teams update live.'
      : result && pending
        ? 'Pending results.'
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
