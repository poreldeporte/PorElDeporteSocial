import { StyleSheet, type ScrollViewProps } from 'react-native'
import { useCallback, useState, type ReactNode } from 'react'

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
  Plus,
  UserPlus,
  ShieldCheck,
  Zap,
} from '@tamagui/lucide-icons'
import { screenContentContainerStyle } from 'app/constants/layout'
import { BRAND_COLORS } from 'app/constants/colors'
import { api } from 'app/utils/api'
import { isProfileApproved } from 'app/utils/auth/profileApproval'
import { useRefreshOnFocus } from 'app/utils/react-query/useRefreshOnFocus'
import { useQueueActions } from 'app/utils/useQueueActions'
import { useRouter } from 'solito/router'
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { useLink } from 'solito/link'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { getDockSpacer } from 'app/constants/dock'

import {
  AddGuestSheet,
  AddPlayerSheet,
  CombinedStatusBadge,
  GameActionBar,
  RateGameSheet,
  RosterSection,
  SectionTitle,
} from './components'
import { getGameCtaIcon, type GameCtaState } from './cta-icons'
import { ctaButtonStyles } from './cta-styles'
import { deriveCombinedStatus, deriveUserStateMessage, getConfirmCountdownLabel } from './status-helpers'
import { useGameDetailState } from './useGameDetailState'
import { canAdminAccessDraftRoom, canPlayerAccessDraftRoom, resolveDraftVisibility } from './draft-visibility'
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
  const { data, isLoading, error, refetch } = api.games.byId.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  )
  const router = useRouter()
  const toast = useToastController()
  const utils = api.useUtils()
  const { join, leave, grabOpenSpot, confirmAttendance, pendingGameId, isPending, isConfirming } =
    useQueueActions()
  const { isAdmin, user, profile } = useUser()
  const insets = useSafeAreaInsets()
  const draftLink = useLink({ href: `/games/${gameId}/draft` })
  const resultLink = useLink({ href: `/games/${gameId}/result` })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)
  const [addGuestOpen, setAddGuestOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmingGuestId, setConfirmingGuestId] = useState<string | null>(null)
  const [markingNoShowId, setMarkingNoShowId] = useState<string | null>(null)
  const [markingTardyId, setMarkingTardyId] = useState<string | null>(null)
  const [markingConfirmedId, setMarkingConfirmedId] = useState<string | null>(null)
  const [menuCloseTick, setMenuCloseTick] = useState(0)
  const closeMenus = useCallback(() => {
    setMenuCloseTick((prev) => prev + 1)
  }, [])

  useRefreshOnFocus(refetch)

  const removeMutation = api.queue.removeMember.useMutation({
    onSuccess: async ({ gameId }) => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Player removed')
    },
    onError: (err) => toast.show('Unable to remove player', { message: err.message }),
    onSettled: () => setRemovingId(null),
  })
  const removeGuestMutation = api.queue.removeGuest.useMutation({
    onSuccess: async ({ gameId }) => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Guest removed')
    },
    onError: (err) => toast.show('Unable to remove guest', { message: err.message }),
    onSettled: () => setRemovingId(null),
  })
  const confirmAttendanceMutation = api.queue.markAttendanceConfirmed.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Attendance confirmed')
    },
    onError: (err) => toast.show('Unable to confirm attendance', { message: err.message }),
    onSettled: () => setConfirmingId(null),
  })
  const confirmGuestMutation = api.queue.confirmGuestAttendance.useMutation({
    onSuccess: async ({ gameId: resolvedGameId }) => {
      await Promise.all([
        utils.games.list.invalidate(),
        utils.games.byId.invalidate({ id: resolvedGameId ?? gameId }),
      ])
      toast.show('Guest confirmed')
    },
    onError: (err) => toast.show('Unable to confirm guest', { message: err.message }),
    onSettled: () => setConfirmingGuestId(null),
  })
  const markNoShowMutation = api.queue.markNoShow.useMutation({
    onSuccess: async ({ gameId: resolvedGameId }, variables) => {
      await Promise.all([
        utils.games.list.invalidate(),
        utils.games.byId.invalidate({ id: resolvedGameId ?? gameId }),
      ])
      toast.show(variables.isNoShow ? 'No-show flagged' : 'No-show cleared')
    },
    onError: (err) => toast.show('Unable to update no-show', { message: err.message }),
    onSettled: () => setMarkingNoShowId(null),
  })
  const markTardyMutation = api.queue.markTardy.useMutation({
    onSuccess: async ({ gameId: resolvedGameId }, variables) => {
      await Promise.all([
        utils.games.list.invalidate(),
        utils.games.byId.invalidate({ id: resolvedGameId ?? gameId }),
      ])
      toast.show(variables.isTardy ? 'Tardy flagged' : 'Tardy cleared')
    },
    onError: (err) => toast.show('Unable to update tardy', { message: err.message }),
    onSettled: () => setMarkingTardyId(null),
  })
  const markConfirmedMutation = api.queue.markConfirmed.useMutation({
    onSuccess: async ({ gameId: resolvedGameId }) => {
      await Promise.all([
        utils.games.list.invalidate(),
        utils.games.byId.invalidate({ id: resolvedGameId ?? gameId }),
      ])
      toast.show('Player confirmed')
    },
    onError: (err) => toast.show('Unable to confirm player', { message: err.message }),
    onSettled: () => setMarkingConfirmedId(null),
  })

  const view = useGameDetailState({
    game: data,
    userId: user?.id ?? null,
    queueState: { pendingGameId, isPending },
  })
  const dateLabel = view.startDate
    ? view.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''
  useGameRealtimeSync(data?.id)

  const canManage = !!data && isAdmin
  const isApprovedMember = isProfileApproved(profile)
  const canAddGuest =
    !!data &&
    !view.isUnreleased &&
    data.status === 'scheduled' &&
    (canManage || (isApprovedMember && !view.isLocked))
  const draftEnabled = !!data && data.draftModeEnabled !== false
  const draftVisibility = data ? resolveDraftVisibility(data.draftVisibility) : 'public'
  const canPlayerSeeDraftRoom = data ? canPlayerAccessDraftRoom(data) : false
  const showDraftCard = data
    ? canManage
      ? !view.isUnreleased && draftEnabled && canAdminAccessDraftRoom(data)
      : canPlayerSeeDraftRoom
    : false
  const showDraftHelper = canManage && !!data && data.draftModeEnabled === false && !view.isUnreleased
  const resultActionLabel = data && canManage ? getResultActionLabel(data) : null
  const userAttendanceConfirmed =
    view.userEntry?.status === 'rostered' &&
    (!data.confirmationEnabled || Boolean(view.userEntry?.attendanceConfirmedAt))
  const combinedStatus = data
    ? deriveCombinedStatus({
        gameStatus: data.status,
        rosteredCount: view.rosteredCount,
        capacity: data.capacity,
        isLocked: view.isLocked,
        userStatus: view.userEntry?.status ?? 'none',
        attendanceConfirmed: userAttendanceConfirmed,
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
  const displayStatus = view.isUnreleased && view.releaseLabel
    ? { label: `Releases ${view.releaseLabel}`, tone: 'neutral' as const }
    : confirmCountdownLabel && combinedStatus
      ? { ...combinedStatus, label: confirmCountdownLabel }
      : combinedStatus
  const userStateMessage = deriveUserStateMessage({
    queueStatus: view.userEntry?.status ?? 'none',
    attendanceConfirmed: userAttendanceConfirmed,
    canConfirmAttendance: view.canConfirmAttendance,
    confirmationWindowStart: view.confirmationWindowStart,
    gameStatus: data?.status ?? 'scheduled',
    isLocked: view.isLocked,
    isGrabOnly: view.isGrabOnly,
    spotsLeft: view.spotsLeft,
  })
  const resolvedUserStateMessage =
    view.isUnreleased && view.releaseLabel
      ? `Releases ${view.releaseLabel}.`
      : userStateMessage
  const showAddPlayer = canManage && data.status === 'scheduled' && !view.isUnreleased
  const rosterActions =
    canAddGuest || showAddPlayer ? (
      <XStack ai="center" gap="$1">
        {canAddGuest ? (
          <Button
            size="$2"
            circular
            icon={UserPlus}
            aria-label="Add guest"
            backgroundColor="$color2"
            borderWidth={1}
            borderColor="$color4"
            pressStyle={{ backgroundColor: '$color3' }}
            hoverStyle={{ backgroundColor: '$color3' }}
            onPress={() => setAddGuestOpen(true)}
          />
        ) : null}
        {showAddPlayer ? (
          <Button
            size="$2"
            circular
            icon={Plus}
            aria-label="Add player"
            backgroundColor="$color2"
            borderWidth={1}
            borderColor="$color4"
            pressStyle={{ backgroundColor: '$color3' }}
            hoverStyle={{ backgroundColor: '$color3' }}
            onPress={() => setAddPlayerOpen(true)}
          />
        ) : null}
      </XStack>
    ) : null
  const handleRemoveEntry = (entry: GameDetail['queue'][number]) => {
    setRemovingId(entry.id)
    if (entry.isGuest) {
      removeGuestMutation.mutate({ queueId: entry.id })
    } else {
      removeMutation.mutate({ queueId: entry.id })
    }
  }
  const handleConfirmMember = (profileId: string | null) => {
    if (!profileId) return
    setConfirmingId(profileId)
    confirmAttendanceMutation.mutate({ gameId: data.id, profileId })
  }
  const handleConfirmGuest = (queueId: string) => {
    setConfirmingGuestId(queueId)
    confirmGuestMutation.mutate({ queueId })
  }
  const handleMarkNoShow = (entry: GameDetail['queue'][number], nextValue: boolean) => {
    setMarkingNoShowId(entry.id)
    markNoShowMutation.mutate({ queueId: entry.id, isNoShow: nextValue })
  }
  const handleMarkTardy = (entry: GameDetail['queue'][number], nextValue: boolean) => {
    setMarkingTardyId(entry.id)
    markTardyMutation.mutate({ queueId: entry.id, isTardy: nextValue })
  }
  const handleMarkConfirmed = (entry: GameDetail['queue'][number]) => {
    setMarkingConfirmedId(entry.id)
    markConfirmedMutation.mutate({ queueId: entry.id })
  }

  const handleCta = () => {
    if (!data) return
    if (view.ctaLabel === 'Rate the game') {
      setRateOpen(true)
      return
    }
    if (view.ctaState === 'claim' || view.ctaState === 'join-waitlist') {
      join(data.id)
      return
    }
    if (view.ctaState === 'grab-open-spot') {
      grabOpenSpot(data.id)
      return
    }
    if (view.ctaState === 'drop') {
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
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )
  const { onScrollBeginDrag, onMomentumScrollBegin, ...restScrollProps } = scrollViewProps
  const mergedScrollProps: ScrollViewProps = {
    ...restScrollProps,
    onScrollBeginDrag: (event) => {
      closeMenus()
      onScrollBeginDrag?.(event)
    },
    onMomentumScrollBegin: (event) => {
      closeMenus()
      onMomentumScrollBegin?.(event)
    },
  }

  return (
    <YStack f={1} bg="$background">
      <ScrollView
        style={{ flex: 1 }}
        {...mergedScrollProps}
        contentContainerStyle={mergedContentStyle}
      >
        {headerSpacer}
        <YStack gap="$3">
          <GameHeader
            kickoffLabel={view.kickoffLabel}
            locationName={data.locationName}
            dateLabel={dateLabel}
            status={displayStatus}
          />

          <YStack gap="$2">
            {isWeb ? (
              <AttendanceCard
                message={resolvedUserStateMessage}
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
            {showDraftCard ? (
              <DraftStatusCard
                draftStatus={data.draftStatus}
                canManage={canManage}
                draftVisibility={draftVisibility}
                result={data.result}
                draftLink={draftLink}
              />
            ) : showDraftHelper ? (
              <DraftModeDisabledCard />
            ) : null}
          </YStack>

          {shouldShowMatchSummary({
            draftEnabled,
            result: data.result,
            teams: data.teams ?? [],
            draftStatus: data.draftStatus,
            showEmptyState: canManage,
          }) ? (
            <>
              <SectionTitle
                action={
                  resultActionLabel ? (
                    <Button size="$2" chromeless iconAfter={ArrowRight} {...resultLink}>
                      {resultActionLabel}
                    </Button>
                  ) : null
                }
              >
                Match summary
              </SectionTitle>
              <ResultSummary
                result={data.result}
                teams={data.teams ?? []}
                captains={data.captains}
                showEmptyState={canManage}
                draftStatus={data.draftStatus}
              />
            </>
          ) : null}

          <SectionTitle
            meta={`${view.rosteredCount}/${data.capacity}`}
            action={rosterActions}
          >
            Roster
          </SectionTitle>
          <RosterSection
            entries={view.rosteredPlayers}
            canManage={canManage}
            currentProfileId={user?.id ?? null}
            communityId={data.communityId}
            removingId={removingId}
            confirmingId={confirmingId}
            confirmingGuestId={confirmingGuestId}
            markingNoShowId={markingNoShowId}
            markingTardyId={markingTardyId}
            markingConfirmedId={markingConfirmedId}
            confirmationEnabled={data.confirmationEnabled}
            isConfirmationOpen={view.isConfirmationOpen}
            closeMenusSignal={menuCloseTick}
            gameStatus={data.status}
            onRemoveEntry={handleRemoveEntry}
            onConfirmAttendance={handleConfirmMember}
            onConfirmGuest={handleConfirmGuest}
            onMarkNoShow={handleMarkNoShow}
            onMarkTardy={handleMarkTardy}
            onMarkConfirmed={handleMarkConfirmed}
          />

          {view.waitlistedPlayers.length ? (
            <>
              <SectionTitle>Waitlist</SectionTitle>
              <RosterSection
                entries={view.waitlistedPlayers}
                emptyLabel="No one on the waitlist yet."
                canManage={canManage}
                currentProfileId={user?.id ?? null}
                communityId={data.communityId}
                removingId={removingId}
                closeMenusSignal={menuCloseTick}
                gameStatus={data.status}
                onRemoveEntry={handleRemoveEntry}
              />
            </>
          ) : null}

          <SectionTitle>Community guidelines</SectionTitle>
          <CommunityGuidelinesSection />
        </YStack>
        <YStack h={actionBarSpacer} />
      </ScrollView>
      {showActionBar ? (
        <GameActionBar
          view={view}
          userStateMessage={resolvedUserStateMessage}
          onCta={handleCta}
          onConfirmAttendance={() => confirmAttendance(data.id)}
          isConfirming={isConfirming}
        />
      ) : null}
      <RateGameSheet
        open={rateOpen}
        onOpenChange={setRateOpen}
        gameId={data.id}
        gameName={data.name}
      />
      {canAddGuest ? (
        <AddGuestSheet open={addGuestOpen} onOpenChange={setAddGuestOpen} gameId={data.id} />
      ) : null}
      {canManage ? (
        <AddPlayerSheet
          open={addPlayerOpen}
          onOpenChange={setAddPlayerOpen}
          gameId={data.id}
          queue={data.queue ?? []}
          audienceGroupId={data.audienceGroupId}
        />
      ) : null}
    </YStack>
  )
}

const GameHeader = ({
  kickoffLabel,
  locationName,
  dateLabel,
  status,
}: {
  kickoffLabel: string
  locationName?: string | null
  dateLabel?: string
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
      <XStack ai="center" jc="space-between" gap="$3">
        <Paragraph fontWeight="600" flex={1}>
          {locationName ?? 'Venue TBD'}
        </Paragraph>
        {dateLabel ? (
          <Paragraph fontWeight="600" textAlign="right">
            {dateLabel}
          </Paragraph>
        ) : null}
      </XStack>
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
  const isGrabOpenSpot = ctaLabel === 'Grab open spot'
  const isClaimCta = !isConfirmation && (ctaLabel === 'Claim spot' || isJoinWaitlist || isGrabOpenSpot)
  const isDropCta = ctaLabel === 'Drop'
  const isCompletedCta = ctaLabel === 'Game completed'
  const usesCustomCtaStyle =
    isConfirmation || isRateCta || isClaimCta || isDropCta || isCompletedCta
  const ctaState: GameCtaState | undefined =
    ctaLabel === 'Drop'
      ? 'drop'
      : ctaLabel === 'Claim spot'
        ? 'claim'
        : ctaLabel === 'Join waitlist'
          ? 'join-waitlist'
          : ctaLabel === 'Grab open spot'
            ? 'grab-open-spot'
            : undefined
  const icon = getGameCtaIcon({
    isPending: isLoading,
    showConfirm: isConfirmation,
    isRate: isRateCta,
    ctaState,
  })
  const ctaStyle = isConfirmation
    ? ctaButtonStyles.brandSolid
    : isRateCta || isCompletedCta
      ? ctaButtonStyles.neutralSolid
      : isDropCta
        ? ctaButtonStyles.inkOutline
        : isClaimCta
          ? ctaButtonStyles.brandSolid
          : {}
  const buttonTheme =
    usesCustomCtaStyle ? undefined : theme === 'alt2' ? 'alt2' : undefined
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
          {...ctaStyle}
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
  draftVisibility,
  result,
  draftLink,
}: {
  draftStatus: GameDetail['draftStatus']
  canManage: boolean
  draftVisibility: ReturnType<typeof resolveDraftVisibility>
  result: GameDetail['result']
  draftLink: ReturnType<typeof useLink>
}) => {
  const content = getDraftStatusContent(draftStatus, canManage, result)
  return (
    <Card
      bordered
      bw={1}
      boc="$black1"
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
        {content.hint ? (
          <Paragraph theme="alt2" size="$2">
            {content.hint}
          </Paragraph>
        ) : null}
      </YStack>
    </Card>
  )
}

const DraftModeDisabledCard = () => (
  <Card bordered bw={1} boc="$black1" px="$3" py="$3">
    <YStack gap="$1.5">
      <SizableText fontWeight="600">Draft mode is off</SizableText>
      <Paragraph theme="alt2" size="$2">
        Enable draft mode to create teams and track scores.
      </Paragraph>
    </YStack>
  </Card>
)

const getDraftStatusContent = (
  draftStatus: GameDetail['draftStatus'],
  canManage: boolean,
  result: GameDetail['result']
): {
  headline: string
  subline?: string
  note?: string
  hint?: string
} => {
  const manageHint = 'Tap to manage picks'
  const resultHint = 'Tap to manage draft'
  if (canManage && result) {
    if (result.status === 'confirmed') {
      return {
        headline: 'Final score posted',
        subline: 'Draft room stays available for changes.',
        hint: resultHint,
      }
    }
    return {
      headline: 'Result submitted',
      subline: 'Draft room stays open if teams change.',
      hint: resultHint,
    }
  }
  switch (draftStatus) {
    case 'in_progress':
      return {
        headline: canManage ? 'Captains are drafting' : 'Draft happening now',
        subline: undefined,
        note: canManage ? 'Monitor picks and undo if needed.' : undefined,
        hint: canManage ? manageHint : 'Tap to watch live picks',
      }
    case 'completed':
      return {
        headline: 'Teams set!',
        subline: 'Teams are set. Review squads before kickoff.',
        hint: 'Tap to review teams',
      }
    case 'ready':
      return {
        headline: canManage ? 'Captains set' : 'Draft starting now',
        subline: canManage ? 'Ready when you are.' : 'Captains are ready to pick.',
        hint: canManage ? undefined : 'Tap to enter the draft room',
      }
    case 'pending':
    default:
      return {
        headline: canManage ? 'Select captains to start the draft' : 'Captains coming soon',
        subline: canManage
          ? 'Select rostered captains. Votes are advisory.'
          : 'We’ll draft as soon as captains are announced.',
        hint: canManage ? 'Tap to select captains' : 'Captains coming soon',
      }
  }
}

const getResultActionLabel = (game: GameDetail) => {
  if (game.status === 'cancelled') return null
  if (game.draftModeEnabled === false) return null
  const teamsReady = game.teams.length >= 2
  const captainsReady = game.captains.length >= 2
  if (!game.result) {
    if (game.draftStatus !== 'completed') return null
    if (!teamsReady || !captainsReady) return null
    return 'Report result'
  }
  return game.result.status !== 'confirmed' ? 'Confirm result' : 'Update result'
}

const shouldShowMatchSummary = ({
  draftEnabled,
  result,
  teams,
  draftStatus,
  showEmptyState,
}: {
  draftEnabled: boolean
  result: GameDetail['result']
  teams: GameDetail['teams']
  draftStatus: GameDetail['draftStatus']
  showEmptyState: boolean
}) => {
  if (!draftEnabled) return false
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
    <Card bordered borderColor="$black1" p={0} gap={0} br="$4" overflow="hidden" backgroundColor="$color1">
      {introText ? (
        <YStack px="$3" py="$2" borderBottomWidth={decoratedTeams.length ? 1 : 0} borderColor="$black1">
          <Paragraph theme="alt2">{introText}</Paragraph>
        </YStack>
      ) : null}
      {decoratedTeams.length ? (
        <YStack gap={0}>
          {decoratedTeams.map(({ team, variant, score, captainName, captainProfileId }, index) => (
            <ResultTeamSection
              key={team.id}
              team={team}
              variant={result ? variant : 'neutral'}
              captainName={captainName}
              score={result ? score : null}
              captainProfileId={captainProfileId}
              index={index}
            />
          ))}
        </YStack>
      ) : (
        <YStack px="$3" py="$2">
          <Paragraph theme="alt2">Teams not finalized yet.</Paragraph>
        </YStack>
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
  index,
}: {
  team: GameDetail['teams'][number]
  variant: ResultTeamVariant
  captainName?: string | null
  captainProfileId?: string | null
  score?: number | null
  index: number
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
    <YStack
      px="$3"
      py="$2"
      gap="$1.5"
      bg={tone.bg as any}
      borderTopWidth={index === 0 ? 0 : 1}
      borderColor="$black1"
    >
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
  <Card bordered borderColor="$black1" p={0}>
    <YStack gap={0}>
      {COMMUNITY_GUIDELINES.map(({ icon: Icon, title, description }, index) => {
        const GuidelineIcon = Icon ?? Heart
        return (
          <XStack
            key={title}
            ai="flex-start"
            gap="$2"
            $gtSm={{ ai: 'center' }}
            px="$3"
            py="$2"
            borderTopWidth={index === 0 ? 0 : 1}
            borderColor="$black1"
          >
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
