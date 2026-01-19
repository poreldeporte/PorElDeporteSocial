'use client'

import { StyleSheet, type ScrollViewProps } from 'react-native'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  Button,
  Card,
  ConfirmDialog,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  Spinner,
  XStack,
  YStack,
  submitButtonBaseProps,
  useToastController,
} from '@my/ui/public'
import { UserAvatar } from 'app/components/UserAvatar'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { formatProfileName } from 'app/utils/profileName'
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'
import { useTeamsState } from 'app/utils/useTeamsState'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useUser } from 'app/utils/useUser'

import { Heart, Undo2 } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/router'
import { DraftRoomLiveOverlay, SectionTitle, StatusBadge, getDraftChatDockInset } from './components'
import { RecentFormChips } from './components/RecentFormChips'
import { deriveDraftViewModel } from './state/deriveDraftViewModel'
import {
  canAdminAccessDraftRoom,
  canPlayerAccessDraftRoom,
  isRosterReadyForDraft,
  resolveDraftVisibility,
} from './draft-visibility'
import type { GameDetail } from './types'
import { formatGameKickoffLabel } from './time-utils'

type DraftViewModel = ReturnType<typeof deriveDraftViewModel>
type DraftTeam = ReturnType<typeof useTeamsState>['teams'][number]

type DraftScreenProps = {
  gameId: string
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

type DraftResetControlProps = {
  resetConfirmOpen?: boolean
  onResetConfirmOpenChange?: (open: boolean) => void
}

export const GameDraftScreen = ({
  gameId,
  scrollProps,
  headerSpacer,
  topInset,
  resetConfirmOpen: resetConfirmOpenProp,
  onResetConfirmOpenChange,
}: DraftScreenProps & ScrollHeaderProps & DraftResetControlProps) => {
  const toast = useToastController()
  const utils = api.useUtils()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const [localResetConfirmOpen, setLocalResetConfirmOpen] = useState(false)
  const resetConfirmOpen = resetConfirmOpenProp ?? localResetConfirmOpen
  const setResetConfirmOpen = onResetConfirmOpenChange ?? setLocalResetConfirmOpen
  const [optimisticPicks, setOptimisticPicks] = useState<string[]>([])
  const [selectedCaptainIds, setSelectedCaptainIds] = useState<string[]>([])
  const [draftStyle, setDraftStyle] = useState<'snake' | 'original'>('snake')
  const [draftStyleTouched, setDraftStyleTouched] = useState(false)
  const { data: gameDetail, isLoading: gameLoading } = api.games.byId.useQuery(
    { id: gameId },
    { enabled: !!gameId }
  )
  const {
    query,
    game,
    teams,
    events,
    draftedPlayerIds,
    captainTeam,
    currentTurnTeam,
    isAdmin,
    isCaptainTurn,
    isCaptain,
    refetch,
  } = useTeamsState({
    gameId,
  })
  useGameRealtimeSync(gameId)
  const resetDraftMutation = api.teams.resetDraft.useMutation({
    onSuccess: async () => {
      setResetConfirmOpen(false)
      await Promise.all([refetch(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Draft reset')
    },
    onError: (error) => toast.show('Unable to reset draft', { message: error.message }),
  })
  const assignCaptainsMutation = api.games.assignCaptains.useMutation({
    onSuccess: async () => {
      setSelectedCaptainIds([])
      await Promise.all([refetch(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Captains set')
    },
    onError: (error) => toast.show('Unable to set captains', { message: error.message }),
  })
  const startDraftMutation = api.teams.startDraft.useMutation({
    onSuccess: async () => {
      await Promise.all([refetch(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Draft started')
    },
    onError: (error) => toast.show('Unable to start draft', { message: error.message }),
  })
  const pickMutation = api.teams.pickPlayer.useMutation()
  const undoPickMutation = api.teams.undoPick.useMutation({
    onSuccess: async () => {
      await Promise.all([refetch(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Last pick undone')
    },
    onError: (error) => toast.show('Unable to undo pick', { message: error.message }),
  })
  const toggleCaptainVoteMutation = api.games.toggleCaptainVote.useMutation({
    onSuccess: async () => {
      await utils.games.captainVotes.invalidate({ gameId })
    },
    onError: (error) => toast.show('Unable to vote', { message: error.message }),
  })

  const draftView = useMemo(
    () =>
      deriveDraftViewModel({
        gameDetail,
        gameMeta: game,
        teams,
        draftedPlayerIds,
        optimisticPicks,
        captainTeam,
        currentTurnTeam,
        isAdmin,
        isCaptainTurn,
      }),
    [
      gameDetail,
      game,
      teams,
      draftedPlayerIds,
      optimisticPicks,
      captainTeam,
      currentTurnTeam,
      isAdmin,
      isCaptainTurn,
    ]
  )

  const draftVisibility = gameDetail ? resolveDraftVisibility(gameDetail.draftVisibility) : 'public'
  const canAccessDraftRoom = gameDetail
    ? isAdmin
      ? canAdminAccessDraftRoom(gameDetail)
      : canPlayerAccessDraftRoom(gameDetail)
    : false
  const hideAccessScreen =
    !isAdmin &&
    gameDetail &&
    (gameDetail.draftModeEnabled === false || draftVisibility === 'admin_only')
  useEffect(() => {
    if (hideAccessScreen) {
      router.replace(`/games/${gameId}`)
    }
  }, [gameId, hideAccessScreen, router])
  const {
    draftStatus,
    captains,
    rosteredRoster,
    rosteredPlayers,
    availablePlayers,
    totalDrafted,
    hasCaptains,
    canPick,
    pickNumberWithPending,
    currentRound,
    nextTeamName,
    currentCaptainTeam,
  } = draftView
  const canVoteCaptains = draftStatus === 'pending'
  const captainVotesQuery = api.games.captainVotes.useQuery(
    { gameId },
    { enabled: Boolean(gameId && canVoteCaptains) }
  )

  const rosteredCount = rosteredRoster.length
  const availableCaptainCounts = useMemo(() => {
    const counts: number[] = []
    for (let i = 2; i <= rosteredCount; i += 1) {
      if (rosteredCount % i === 0) counts.push(i)
    }
    return counts
  }, [rosteredCount])
  const selectedCaptainCount = selectedCaptainIds.length
  const isValidCaptainCount =
    selectedCaptainCount >= 2 && availableCaptainCounts.includes(selectedCaptainCount)
  const captainTeamSize =
    isValidCaptainCount && selectedCaptainCount > 0
      ? Math.floor(rosteredCount / selectedCaptainCount)
      : 0
  const currentUserId = user?.id ?? null
  const voteCounts = captainVotesQuery.data?.counts ?? {}
  const myVotes = captainVotesQuery.data?.myVotes ?? []
  const voteLimit = captainVotesQuery.data?.limit ?? 2
  const votesRemaining = Math.max(0, voteLimit - myVotes.length)
  const canVote = canVoteCaptains && Boolean(currentUserId)
  const rosterCapacity = gameDetail?.capacity ?? 0
  const rosterFullForDraft = Boolean(rosterCapacity && rosteredCount >= rosterCapacity)
  const rosterReadyForDraft = gameDetail ? isRosterReadyForDraft(gameDetail) : false

  const [recentPick, setRecentPick] = useState<{ teamId: string | null; playerId: string | null } | null>(null)
  const lastPickRef = useRef<string | null>(null)

  const hasUndoablePick = useMemo(() => {
    return (events ?? []).some((event) => {
      if (event.action !== 'pick') return false
      const payload = (event.payload as Record<string, unknown> | null) ?? {}
      return !payload.undone
    })
  }, [events])

  useEffect(() => {
    if (!events?.length) return
    const latestPick = [...events]
      .filter((event) => event.action === 'pick')
      .reverse()
      .find((event) => {
        const payload = (event.payload as Record<string, unknown> | null) ?? {}
        return !payload.undone
      })
    if (latestPick && latestPick.id !== lastPickRef.current) {
      lastPickRef.current = latestPick.id
      const recentPlayerId = latestPick.profile_id ?? latestPick.guest_queue_id ?? null
      setRecentPick({ teamId: latestPick.team_id ?? null, playerId: recentPlayerId })
      const timer = setTimeout(() => setRecentPick(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [events])

  useEffect(() => {
    setOptimisticPicks((prev) => {
      const filtered = prev.filter((id) =>
        availablePlayers.some((player) => player.player.id === id)
      )
      return filtered.length === prev.length ? prev : filtered
    })
  }, [availablePlayers])

  useEffect(() => {
    if (draftStatus !== 'pending' || hasCaptains) {
      setSelectedCaptainIds((prev) => (prev.length ? [] : prev))
      return
    }
    setSelectedCaptainIds((prev) => {
      const filtered = prev.filter((id) =>
        rosteredRoster.some((entry) => entry.profileId === id)
      )
      return filtered.length === prev.length ? prev : filtered
    })
  }, [rosteredRoster, draftStatus, hasCaptains])

  useEffect(() => {
    if (!gameDetail) return
    const styleFromGame =
      gameDetail.draftStyle === 'original' || gameDetail.draftStyle === 'snake'
        ? gameDetail.draftStyle
        : null
    if (styleFromGame) {
      setDraftStyle(styleFromGame)
      setDraftStyleTouched(false)
      return
    }
  }, [gameDetail?.draftStyle])

  const handlePick = (entry: DraftViewModel['availablePlayers'][number]) => {
    const teamId = captainTeam?.id ?? currentTurnTeam?.id
    if (!teamId) return
    const playerId = entry.player.id
    setOptimisticPicks((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]))
    if (!entry.isGuest && !entry.profileId) {
      toast.show('Unable to draft player', { message: 'Missing player profile.' })
      setOptimisticPicks((prev) => prev.filter((id) => id !== playerId))
      return
    }
    pickMutation.mutate(
      entry.isGuest
        ? { gameId, teamId, guestQueueId: entry.id }
        : { gameId, teamId, profileId: entry.profileId as string },
      {
        onError: (error) => {
          toast.show('Unable to draft player', { message: error.message })
        },
        onSettled: () => {
          setOptimisticPicks((prev) => prev.filter((id) => id !== playerId))
        },
      }
    )
  }

  const handleToggleVote = (profileId: string) => {
    if (!canVoteCaptains || !currentUserId) return
    if (profileId === currentUserId) {
      toast.show('Unable to vote', { message: 'You cannot vote for yourself.' })
      return
    }
    const alreadyVoted = myVotes.includes(profileId)
    if (!alreadyVoted && votesRemaining <= 0) {
      toast.show('No votes left', { message: `You can vote for up to ${voteLimit} captains.` })
      return
    }
    toggleCaptainVoteMutation.mutate({ gameId, nomineeProfileId: profileId })
  }

  const isSyncing = query.isFetching || pickMutation.isPending
  const hasAvailablePlayers = availablePlayers.length > 0
  const captainTeamName = captainTeam?.name ?? currentCaptainTeam?.name ?? null
  const roleAlertMessage = getRoleAlert({
    draftStatus,
    canPick,
    isCaptain,
    isAdmin,
    nextTeamName,
    captainTeamName,
    hasAvailablePlayers,
  })
  const bannerStatus = buildBannerStatus({
    draftStatus,
    currentRound,
    pickNumber: pickNumberWithPending,
    hasAvailablePlayers,
    totalDrafted,
    totalPlayers: rosteredPlayers.length,
    rosteredCount,
    capacity: rosterCapacity,
    rosterFullForDraft,
    isAdmin,
  })
  const showSpectatorNotice = !isAdmin && !isCaptain
  const canUseOriginal =
    gameDetail?.capacity === 12 &&
    (draftStatus === 'pending' ? selectedCaptainCount === 2 : captains.length === 2)
  const defaultDraftStyle = canUseOriginal ? 'original' : 'snake'
  const resolvedDraftStyle = draftStyle === 'original' ? 'original' : 'snake'
  const canStartDraftPending =
    isAdmin &&
    draftStatus === 'pending' &&
    rosterReadyForDraft &&
    isValidCaptainCount &&
    !assignCaptainsMutation.isPending
  const canStartDraftReady = isAdmin && draftStatus === 'ready' && rosterReadyForDraft
  const canStartDraft =
    (canStartDraftPending || canStartDraftReady) &&
    !startDraftMutation.isPending &&
    !assignCaptainsMutation.isPending
  const selectionSummary =
    isAdmin && draftStatus === 'pending' && rosterReadyForDraft
      ? selectedCaptainCount === 0
        ? 'Select captains below, then press Start draft.'
        : isValidCaptainCount
          ? `Selected ${selectedCaptainCount} captains · Teams of ${captainTeamSize} players`
          : `Selected ${selectedCaptainCount} captains · Must divide ${rosteredCount} players`
      : null
  const startDraftDisabled = !canStartDraft || (draftStyle === 'original' && !canUseOriginal)
  const startDraftHelper =
    draftStatus === 'pending'
      ? 'Select captains and fill the roster to enable Start draft.'
      : draftStatus === 'ready'
        ? 'Captains are set. Pick format.'
        : null
  const readyCardMessage = isAdmin
    ? 'Captains set. Draft is ready.'
    : isCaptain
      ? "You're captain today. Get your first pick ready."
      : 'Draft starts soon. Picks go live here.'
  const primaryButtonStyle = (disabled: boolean) =>
    disabled
      ? { backgroundColor: '$color4', borderColor: '$color4', color: '$color11' }
      : { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary, color: '$background' }

  useEffect(() => {
    if (draftStatus !== 'pending' && draftStatus !== 'ready') return
    if (draftStyleTouched) return
    setDraftStyle(defaultDraftStyle)
  }, [defaultDraftStyle, draftStyleTouched, draftStatus])

  useEffect(() => {
    if (!canUseOriginal && draftStyle === 'original') {
      setDraftStyle('snake')
      setDraftStyleTouched(false)
    }
  }, [canUseOriginal, draftStyle])

  if (gameLoading || query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (gameDetail && !canAccessDraftRoom) {
    if (hideAccessScreen) return null
    const message =
      gameDetail.draftModeEnabled === false
        ? 'Draft mode is off for this game.'
        : !isAdmin && draftVisibility === 'admin_only'
          ? 'Draft room is private for admins only.'
          : 'Draft room opens once the roster is full and confirmed.'
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">{message}</Paragraph>
        <Button onPress={() => router.push(`/games/${gameId}`)}>Back to game</Button>
      </YStack>
    )
  }

  if (!gameDetail) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Paragraph theme="alt1">Game unavailable.</Paragraph>
      </YStack>
    )
  }

  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )
  const draftChatEnabled = Boolean(
    gameDetail.draftModeEnabled !== false && gameDetail.draftChatEnabled !== false
  )
  const hideChatDuringPick = draftStatus === 'in_progress' && isCaptain && isCaptainTurn
  const showChatOverlay = draftChatEnabled && !hideChatDuringPick
  const chatDockInset = showChatOverlay ? getDraftChatDockInset(insets.bottom ?? 0) : 0
  const paddedContentStyle = chatDockInset
    ? {
        ...mergedContentStyle,
        paddingBottom: Math.max(mergedContentStyle?.paddingBottom ?? 0, chatDockInset),
      }
    : mergedContentStyle

  const kickoffLabel = formatGameKickoffLabel(new Date(gameDetail.startTime)) || 'Kickoff TBD'

  const toggleCaptain = (profileId: string) => {
    if (draftStatus !== 'pending' || !isAdmin || !rosterReadyForDraft) return
    setSelectedCaptainIds((prev) => {
      const existingIndex = prev.indexOf(profileId)
      if (existingIndex !== -1) {
        return prev.filter((id) => id !== profileId)
      }
      return [...prev, profileId]
    })
  }

  const handleStartDraft = () => {
    if (startDraftDisabled) return
    if (draftStatus === 'pending') {
      assignCaptainsMutation.mutate(
        {
          gameId,
          captains: selectedCaptainIds.map((profileId) => ({ profileId })),
        },
        {
          onSuccess: () => {
            startDraftMutation.mutate({
              gameId,
              draftStyle: resolvedDraftStyle,
            })
          },
        }
      )
      return
    }
    startDraftMutation.mutate({
      gameId,
      draftStyle: resolvedDraftStyle,
    })
  }
  return (
    <YStack f={1} position="relative">
      <ScrollView {...scrollViewProps} contentContainerStyle={paddedContentStyle}>
        {headerSpacer}
        <YStack gap="$4">
          <DraftBanner
            kickoffLabel={kickoffLabel}
            statusLabel={bannerStatus}
            selectionSummary={selectionSummary}
            onUndo={isAdmin ? () => undoPickMutation.mutate({ gameId }) : undefined}
            canUndo={hasUndoablePick && !undoPickMutation.isPending}
            undoPending={undoPickMutation.isPending}
          />
          {(draftStatus === 'pending' || draftStatus === 'ready') && isAdmin ? (
            <YStack gap="$3">
              <DraftStyleSelector
                selectedStyle={resolvedDraftStyle}
                onSelect={(style) => {
                  if (style === resolvedDraftStyle) return
                  setDraftStyle(style)
                  setDraftStyleTouched(true)
                }}
                canUseOriginal={canUseOriginal}
                disabled={assignCaptainsMutation.isPending || startDraftMutation.isPending}
              />
              <Button
                {...submitButtonBaseProps}
                disabled={startDraftDisabled}
                {...primaryButtonStyle(startDraftDisabled)}
                onPress={handleStartDraft}
                iconAfter={
                  assignCaptainsMutation.isPending || startDraftMutation.isPending ? (
                    <Spinner size="small" color="$background" />
                  ) : undefined
                }
                o={startDraftDisabled ? 0.7 : 1}
              >
                {assignCaptainsMutation.isPending || startDraftMutation.isPending ? 'Starting…' : 'Start draft'}
              </Button>
              {startDraftHelper ? (
                <Paragraph theme="alt2" size="$2">
                  {startDraftHelper}
                </Paragraph>
              ) : null}
            </YStack>
          ) : null}

          {draftStatus === 'ready' ? (
            <Card
              px="$4"
              py="$3"
              bordered
              backgroundColor="$color2"
              $platform-native={{ borderWidth: 0 }}
            >
              <Paragraph theme="alt2">{readyCardMessage}</Paragraph>
            </Card>
          ) : (
            <>
              {(draftStatus === 'in_progress' || draftStatus === 'completed') && teams.length > 0 ? (
                <TeamsSection
                  teams={teams}
                  captains={captains}
                  currentTurnTeamId={currentTurnTeam?.id ?? null}
                  draftStatus={draftStatus}
                  totalDrafted={totalDrafted}
                  totalPlayers={rosteredPlayers.length}
                  availableCount={availablePlayers.length}
                  recentPick={recentPick}
                  isAdmin={isAdmin}
                />
              ) : null}

              {roleAlertMessage ? <RoleAlert message={roleAlertMessage} /> : null}

              <AvailablePlayersSection
                availablePlayers={availablePlayers}
                canPick={canPick}
                onPick={handlePick}
                isSyncing={isSyncing}
                draftStatus={draftStatus}
                pendingPlayerIds={optimisticPicks}
                readOnly={showSpectatorNotice}
                isAdmin={isAdmin}
                selectedCaptainIds={selectedCaptainIds}
                onSelectCaptain={toggleCaptain}
                captainSelectionDisabled={!rosterReadyForDraft}
                showCaptainVotes={canVoteCaptains}
                voteCounts={voteCounts}
                myVotes={myVotes}
                voteLimit={voteLimit}
                votesRemaining={votesRemaining}
                canVote={canVote}
                onToggleVote={handleToggleVote}
                votePending={toggleCaptainVoteMutation.isPending}
                currentUserId={currentUserId}
              />
            </>
          )}

          {showSpectatorNotice && draftStatus !== 'completed' && draftStatus !== 'ready' ? (
            <SpectatorNotice draftStatus={draftStatus} />
          ) : null}
        </YStack>

        <ConfirmDialog
          open={resetConfirmOpen}
          onOpenChange={setResetConfirmOpen}
          title="Reset draft?"
          description="This clears captains, teams, and picks so you can start over. Players will remain rostered in the game queue."
          confirmLabel="Reset draft"
          confirmTone="destructive"
          confirmPending={resetDraftMutation.isPending}
          onConfirm={() => resetDraftMutation.mutate({ gameId })}
        />
      </ScrollView>
      <DraftRoomLiveOverlay
        gameId={gameId}
        enabled={showChatOverlay}
        collapsedMessageLimit={canPick ? 0 : undefined}
      />
    </YStack>
  )
}

const DraftBanner = ({
  kickoffLabel,
  statusLabel,
  isAdmin,
  onStartDraft,
  canStartDraft,
  startDraftPending,
  selectionSummary,
  onUndo,
  canUndo,
  undoPending,
}: {
  kickoffLabel: string
  statusLabel: string
  selectionSummary?: string | null
  onUndo?: () => void
  canUndo?: boolean
  undoPending?: boolean
}) => {
  const showUndo = Boolean(onUndo) && ((canUndo ?? false) || (undoPending ?? false))
  const actionButtonProps = {
    size: '$2',
    backgroundColor: '$color2',
    borderWidth: 1,
    borderColor: '$color4',
    pressStyle: { backgroundColor: '$color3' },
    hoverStyle: { backgroundColor: '$color3' },
    br: '$10',
  } as const
  return (
    <YStack
      px="$4"
      py="$3"
      borderWidth={1}
      borderColor="$black1"
      br="$4"
      backgroundColor="$color2"
      $platform-web={{ position: 'sticky', top: 0, zIndex: 10 }}
      gap="$2"
    >
      <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
        <SizableText size="$6" fontWeight="700">
          {kickoffLabel}
        </SizableText>
        {showUndo ? (
          <Button
            {...actionButtonProps}
            icon={Undo2}
            aria-label="Undo last pick"
            disabled={!canUndo || undoPending}
            onPress={onUndo}
            iconAfter={undoPending ? <Spinner size="small" /> : undefined}
          >
            {undoPending ? 'Undoing…' : 'Undo last pick'}
          </Button>
        ) : null}
      </XStack>
      <Paragraph theme="alt1">{statusLabel}</Paragraph>
      {selectionSummary ? (
        <Paragraph theme="alt2" size="$2">
          {selectionSummary}
        </Paragraph>
      ) : null}
    </YStack>
  )
}

const DraftStyleSelector = ({
  selectedStyle,
  onSelect,
  canUseOriginal,
  disabled,
}: {
  selectedStyle: 'snake' | 'original'
  onSelect: (style: 'snake' | 'original') => void
  canUseOriginal: boolean
  disabled?: boolean
}) => {
  const [showRules, setShowRules] = useState(false)
  const buildCardStyle = (active: boolean) => ({
    backgroundColor: active ? '$color2' : '$background',
    borderColor: active ? BRAND_COLORS.primary : '$color4',
  })
  const buildIndicatorStyle = (active: boolean) => ({
    borderColor: active ? BRAND_COLORS.primary : '$color4',
    backgroundColor: 'transparent',
  })
  const options: {
    value: 'snake' | 'original'
    title: string
    description: string
    helper?: string
    rules?: string[]
    isDisabled?: boolean
  }[] = [
    {
      value: 'snake',
      title: 'Snake',
      description: 'Selection order reverses each round.',
      rules: [
        'Order (2 teams): A1, B2, B3, A4, A5, B6.',
        'The last team gets the first pick of the next round.',
      ],
    },
    {
      value: 'original',
      title: 'Original',
      description: 'A breakthrough draft flow built by us.',
      helper: canUseOriginal ? 'Default when available.' : 'Requires 12 players and 2 captains.',
      rules: [
        'Our proprietary sequence built for balance.',
        'Only for 12 players with 2 captains.',
        'Order (10 picks): A1, B2, A3, B4, A5, B6, B7, A8, B9, A10.',
      ],
      isDisabled: !canUseOriginal,
    },
  ]
  return (
    <YStack gap="$3">
      <SectionTitle
        action={
          <Button
            size="$2"
            chromeless
            theme="alt2"
            onPress={() => setShowRules((prev) => !prev)}
            pressStyle={{ opacity: 0.7 }}
          >
            {showRules ? 'Hide rules' : 'Show rules'}
          </Button>
        }
      >
        Choose draft mode
      </SectionTitle>
      <YStack gap="$2">
        {options.map((option) => {
          const isActive = selectedStyle === option.value
          const isDisabled = disabled || option.isDisabled
          return (
            <Card
              key={option.value}
              px="$4"
              py="$3"
              bordered
              $platform-native={{ borderWidth: 1 }}
              {...buildCardStyle(isActive)}
              o={isDisabled ? 0.5 : 1}
              pressStyle={!isDisabled ? { backgroundColor: '$color2' } : undefined}
              onPress={() => {
                if (isDisabled) return
                onSelect(option.value)
              }}
            >
              <XStack ai="center" jc="space-between" gap="$3">
                <YStack gap="$1" flex={1}>
                  <SizableText size="$4" fontWeight="600">
                    {option.title}
                  </SizableText>
                  <Paragraph theme="alt2" size="$2">
                    {option.description}
                  </Paragraph>
                  {option.helper ? (
                    <Paragraph theme="alt2" size="$1">
                      {option.helper}
                    </Paragraph>
                  ) : null}
                  {showRules && option.rules?.length ? (
                    <YStack gap="$1.5" pt="$2">
                      <Separator />
                      {option.rules.map((rule) => (
                        <Paragraph key={rule} size="$2" color="$color">
                          {rule}
                        </Paragraph>
                      ))}
                    </YStack>
                  ) : null}
                </YStack>
                <YStack
                  w={22}
                  h={22}
                  br={999}
                  borderWidth={2}
                  ai="center"
                  jc="center"
                  {...buildIndicatorStyle(isActive)}
                >
                  {isActive ? (
                    <YStack w={8} h={8} br={999} backgroundColor={BRAND_COLORS.primary} />
                  ) : null}
                </YStack>
              </XStack>
            </Card>
          )
        })}
      </YStack>
    </YStack>
  )
}

const TeamsSection = ({
  teams,
  captains,
  currentTurnTeamId,
  draftStatus,
  totalDrafted,
  totalPlayers,
  availableCount,
  recentPick,
  isAdmin,
}: {
  teams: DraftTeam[]
  captains: GameDetail['captains']
  currentTurnTeamId: string | null
  draftStatus: string
  totalDrafted: number
  totalPlayers: number
  availableCount: number
  recentPick: { teamId: string | null; playerId: string | null } | null
  isAdmin: boolean
}) => {
  return (
    <Card bordered borderColor="$black1" p="$4" gap="$3" overflow="hidden">
      <SectionTitle meta={`${totalDrafted}/${totalPlayers} drafted · ${availableCount} available`}>
        Teams
      </SectionTitle>
      {draftStatus === 'in_progress' ? (
        <Paragraph theme="alt2" size="$2">
          Captains are picking now.
        </Paragraph>
      ) : null}
      <XStack gap="$3" flexWrap="wrap">
        {teams.map((team, index) => (
          <TeamCard
            key={`${team.id || 'team'}-${index}`}
            team={team}
            captain={
              captains.find((captain) => captain.profileId === team.captain_profile_id) ??
              captains.find((captain) => captain.slot === team.draft_order + 1)
            }
            isActive={currentTurnTeamId === team.id && draftStatus === 'in_progress'}
            draftStatus={draftStatus}
            recentPick={recentPick}
            isAdmin={isAdmin}
          />
        ))}
      </XStack>
    </Card>
  )
}

const TeamCard = ({
  team,
  captain,
  isActive,
  draftStatus,
  recentPick,
  isAdmin,
}: {
  team: DraftTeam
  captain?:
    | {
        slot: number
        profileId: string
        player: { name: string | null; avatarUrl: string | null; id: string }
      }
    | null
  isActive: boolean
  draftStatus: string
  recentPick: { teamId: string | null; playerId: string | null } | null
  isAdmin: boolean
}) => {
  const roster = [...(team.game_team_members ?? [])]
    .filter((member) => (captain?.player.id ? member.profile_id !== captain.player.id : true))
    .sort((a, b) => {
      const pickA = typeof a.pick_order === 'number' ? a.pick_order : Number.MAX_SAFE_INTEGER
      const pickB = typeof b.pick_order === 'number' ? b.pick_order : Number.MAX_SAFE_INTEGER
      if (pickA !== pickB) return pickA - pickB
      return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
    })

  return (
    <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }} f={1} minWidth={260}>
      <YStack gap="$2">
        <XStack ai="center" jc="space-between">
          <SizableText size="$5" fontWeight="600">
            {team.name}
          </SizableText>
          {isActive ? (
            <StatusBadge
              tone="neutral"
              dotColor="$red9"
              blinkDot
              backgroundColor="$color2"
              borderColor="$color5"
            >
              On the clock
            </StatusBadge>
          ) : draftStatus === 'completed' ? (
            <StatusBadge tone="accent" showIcon={false}>
              {isAdmin ? 'Locked (admin can reset)' : 'Locked'}
            </StatusBadge>
          ) : null}
        </XStack>
        <YStack gap="$1">
          <Paragraph theme="alt2" size="$2">
            Captain
          </Paragraph>
          <Paragraph fontWeight="600">
            {captain?.player.name ?? 'TBD'}
          </Paragraph>
        </YStack>
        <Separator />
        <YStack gap="$2">
          {roster.length ? (
            roster.map((member, index) => {
              const memberId =
                member.profile_id ?? member.guest_queue_id ?? member.game_queue?.id ?? null
              const name = member.profile_id
                ? formatProfileName(member.profiles, 'Member') ?? 'Member'
                : member.game_queue?.guest_name ?? 'Guest'
              return (
                <YStack
                  key={`${memberId || 'member'}-${index}`}
                  gap="$1"
                  px="$2"
                  py="$2"
                  br="$3"
                  backgroundColor={
                    recentPick?.teamId === team.id && recentPick?.playerId === memberId
                      ? '$color3'
                      : undefined
                  }
                >
                  <XStack ai="center" jc="space-between" gap="$3">
                    <Paragraph fontWeight="600" flex={1} minWidth={0} numberOfLines={1}>
                      {name}
                    </Paragraph>
                    <Paragraph theme="alt2" size="$2" textAlign="right">
                      {typeof member.pick_order === 'number' ? `Pick #${member.pick_order}` : 'Pending pick'}
                    </Paragraph>
                  </XStack>
                  {!member.profile_id ? (
                    <Paragraph theme="alt2" size="$2">
                      Guest
                    </Paragraph>
                  ) : null}
                  <Separator />
                </YStack>
              )
            })
          ) : (
            <Paragraph theme="alt2">No picks yet.</Paragraph>
          )}
        </YStack>
      </YStack>
    </Card>
  )
}

const AvailablePlayersSection = ({
  availablePlayers,
  canPick,
  onPick,
  isSyncing,
  draftStatus,
  pendingPlayerIds,
  readOnly = false,
  isAdmin,
  selectedCaptainIds,
  onSelectCaptain,
  captainSelectionDisabled = false,
  showCaptainVotes = false,
  voteCounts,
  myVotes,
  voteLimit = 2,
  votesRemaining = 0,
  canVote = false,
  onToggleVote,
  votePending = false,
  currentUserId,
}: {
  availablePlayers: DraftViewModel['availablePlayers']
  canPick: boolean
  onPick: (entry: DraftViewModel['availablePlayers'][number]) => void
  isSyncing: boolean
  draftStatus: string
  pendingPlayerIds: string[]
  readOnly?: boolean
  isAdmin: boolean
  selectedCaptainIds: string[]
  onSelectCaptain?: (profileId: string) => void
  captainSelectionDisabled?: boolean
  showCaptainVotes?: boolean
  voteCounts?: Record<string, number>
  myVotes?: string[]
  voteLimit?: number
  votesRemaining?: number
  canVote?: boolean
  onToggleVote?: (profileId: string) => void
  votePending?: boolean
  currentUserId?: string | null
}) => {
  const isCaptainSelectionMode = isAdmin && draftStatus === 'pending'
  const votesEnabled = showCaptainVotes && draftStatus === 'pending'
  const voteCountsById = voteCounts ?? {}
  const myVoteSet = useMemo(() => new Set(myVotes ?? []), [myVotes])
  const voteSummary = `${votesRemaining} of ${voteLimit} votes remaining`
  const [pendingPick, setPendingPick] =
    useState<DraftViewModel['availablePlayers'][number] | null>(null)
  const visiblePlayers = isCaptainSelectionMode
    ? availablePlayers.filter((entry) => Boolean(entry.profileId))
    : availablePlayers
  const hasAvailablePlayers = visiblePlayers.length > 0

  useEffect(() => {
    if (!pendingPick) return
    const stillVisible = visiblePlayers.some((entry) => entry.player.id === pendingPick.player.id)
    if (!stillVisible) {
      setPendingPick(null)
    }
  }, [pendingPick, visiblePlayers])

  useEffect(() => {
    if (!canPick && !isCaptainSelectionMode) {
      setPendingPick(null)
    }
  }, [canPick, isCaptainSelectionMode])

  const confirmPickName = pendingPick?.player.name ?? (pendingPick?.isGuest ? 'Guest' : 'Player')
  if (!hasAvailablePlayers && !isSyncing) {
    return null
  }
  return (
    <YStack gap="$3">
      <SectionTitle>Available players</SectionTitle>
      {isCaptainSelectionMode ? (
        <Paragraph theme="alt2" size="$2">
          Tap players to select captains.
        </Paragraph>
      ) : null}
      {votesEnabled ? (
        <Card
          px="$4"
          py="$3"
          bordered
          borderColor="$black1"
          backgroundColor="$color2"
          $platform-native={{ borderWidth: 1 }}
        >
          <YStack gap="$1.5">
            <SizableText size="$4" fontWeight="600">
              Vote for captains
            </SizableText>
            <Paragraph theme="alt2" size="$2">
              Choose {voteLimit} lads you'd trust to lead a team.
            </Paragraph>
            <Paragraph size="$2" fontWeight="600">
              {voteSummary}
            </Paragraph>
          </YStack>
        </Card>
      ) : null}
      <Card bordered borderColor="$black1" p={0} gap={0} overflow="hidden">
        <YStack gap={0}>
          {isSyncing ? (
            <XStack
              ai="center"
              gap="$1"
              px="$3"
              py="$2"
              borderBottomWidth={hasAvailablePlayers ? 1 : 0}
              borderColor="$black1"
            >
              <Spinner size="small" />
              <Paragraph theme="alt2" size="$2">
                Syncing…
              </Paragraph>
            </XStack>
          ) : null}
          {hasAvailablePlayers ? (
            <YStack gap={0}>
              {visiblePlayers.map((entry, index) => {
                const rowPending = pendingPlayerIds.includes(entry.player.id)
                const record = entry.record ?? { wins: 0, losses: 0, recent: [] }
                const recordLabel = entry.isGuest ? 'Guest' : `${record.wins}-${record.losses}`
                const recentForm = entry.isGuest ? [] : record.recent ?? []
                const name = entry.player.name ?? (entry.isGuest ? 'Guest' : 'Member')
                const avatarUrl = entry.isGuest ? null : entry.player.avatarUrl ?? null
                const profileId = entry.profileId ?? null
                const captainIndex = entry.profileId
                  ? selectedCaptainIds.indexOf(entry.profileId)
                  : -1
                const isCaptainSelected = captainIndex !== -1
                const isPendingPick = Boolean(
                  pendingPick && pendingPick.player.id === entry.player.id
                )
                const voteCount =
                  votesEnabled && profileId ? (voteCountsById[profileId] ?? 0) : 0
                const hasVoted = votesEnabled && profileId ? myVoteSet.has(profileId) : false
                const canSelectCaptain =
                  isCaptainSelectionMode && !captainSelectionDisabled && Boolean(entry.profileId)
                const canDraftPlayer = !isCaptainSelectionMode && canPick && !readOnly
                const isSelected = isCaptainSelectionMode
                  ? isCaptainSelected
                  : (canDraftPlayer && isPendingPick) || hasVoted
                const rowBorderColor = isSelected ? '$color12' : '$black1'
                const rowScale = isSelected ? 1 : 0.97
                const rowBackground = rowPending
                  ? '$color3'
                  : isSelected
                    ? '$background'
                    : undefined
                const canInteract = !rowPending && (canSelectCaptain || canDraftPlayer)
                const rowPressStyle = canInteract
                  ? {
                      backgroundColor: isSelected ? '$backgroundPress' : '$color2',
                    }
                  : undefined
                const canVoteRow = votesEnabled && Boolean(profileId) && !entry.isGuest && Boolean(onToggleVote)
                const voteDisabled =
                  !canVote ||
                  !canVoteRow ||
                  votePending ||
                  (!hasVoted && votesRemaining <= 0)
                return (
                  <YStack
                    key={`${entry.id || entry.profileId || 'player'}-${index}`}
                    px="$3"
                    py="$2"
                    borderTopWidth={index === 0 ? 0 : 1}
                    borderColor={rowBorderColor}
                    borderWidth={1}
                    backgroundColor={rowBackground}
                    scale={rowScale}
                    themeInverse={isSelected}
                    animation="100ms"
                    pressStyle={rowPressStyle}
                    onPress={() => {
                      if (!canInteract) return
                      if (canSelectCaptain && entry.profileId) {
                        onSelectCaptain?.(entry.profileId)
                        return
                      }
                      if (canDraftPlayer) {
                        setPendingPick(entry)
                      }
                    }}
                  >
                    <XStack ai="center" gap="$2">
                      <XStack ai="center" gap="$2" flex={1} minWidth={0}>
                        <Paragraph theme="alt2" minWidth={24}>
                          {index + 1}.
                        </Paragraph>
                        <UserAvatar size={40} name={name} avatarUrl={avatarUrl} />
                        <YStack f={1} minWidth={0} gap="$0.5">
                          <XStack ai="center" gap="$1.5" flexWrap="nowrap" minWidth={0}>
                            <SizableText
                              fontWeight="600"
                              numberOfLines={1}
                              flexShrink={1}
                              minWidth={0}
                            >
                              {name}
                            </SizableText>
                            <Paragraph theme="alt2" size="$2" flexShrink={0}>
                              ({recordLabel})
                            </Paragraph>
                          </XStack>
                          {!entry.isGuest ? <RecentFormChips recentForm={recentForm} /> : null}
                        </YStack>
                      </XStack>
                      {votesEnabled && profileId ? (
                        <XStack ai="center" gap="$2">
                          <YStack ai="center" gap="$0.5">
                            <Button
                              chromeless
                              size="$2"
                              p="$1"
                              disabled={voteDisabled}
                              o={voteDisabled ? 0.5 : 1}
                              pressStyle={!voteDisabled ? { opacity: 0.7 } : undefined}
                              onPress={() => {
                                if (!profileId || !onToggleVote) return
                                onToggleVote(profileId)
                              }}
                            >
                              <Button.Icon>
                                <Heart
                                  size={20}
                                  color={hasVoted ? BRAND_COLORS.primary : '$color12'}
                                  fill={hasVoted ? BRAND_COLORS.primary : 'transparent'}
                                />
                              </Button.Icon>
                            </Button>
                            <Paragraph theme="alt2" size="$1">
                              Vote
                            </Paragraph>
                          </YStack>
                          <SizableText
                            size="$3"
                            fontWeight="600"
                            color={hasVoted ? BRAND_COLORS.primary : '$color'}
                          >
                            {voteCount}
                          </SizableText>
                        </XStack>
                      ) : null}
                      {rowPending ? <Spinner size="small" /> : null}
                    </XStack>
                  </YStack>
                )
              })}
            </YStack>
          ) : (
            <YStack px="$3" py="$2">
              <Paragraph theme="alt2" size="$2">
                No available players.
              </Paragraph>
            </YStack>
          )}
        </YStack>
      </Card>
      <ConfirmDialog
        open={Boolean(pendingPick)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPick(null)
          }
        }}
        title="Confirm pick?"
        description={`${confirmPickName} will be drafted to your team.`}
        confirmLabel="Draft player"
        confirmDisabled={!pendingPick}
        onConfirm={() => {
          if (pendingPick) {
            onPick(pendingPick)
          }
          setPendingPick(null)
        }}
      />
    </YStack>
  )
}

const RoleAlert = ({ message }: { message: string }) => (
  <Card
    px="$4"
    py="$3"
    bordered
    backgroundColor="$color2"
    $platform-native={{ borderWidth: 0 }}
  >
    <Paragraph fontWeight="600">{message}</Paragraph>
  </Card>
)

const SpectatorNotice = ({ draftStatus }: { draftStatus: GameDetail['draftStatus'] }) => {
  if (draftStatus === 'completed') return null
  if (draftStatus === 'in_progress') {
    return (
      <Paragraph theme="alt2" size="$3">
        Draft is live. Teams update in real time—enjoy the show.
      </Paragraph>
    )
  }
  if (draftStatus === 'ready') {
    return (
      <Paragraph theme="alt2" size="$3">
        Captains set. Draft begins soon.
      </Paragraph>
    )
  }
  return (
    <Paragraph theme="alt2" size="$3">
      No captains yet. We'll ping you when picks start.
    </Paragraph>
  )
}

const buildBannerStatus = ({
  draftStatus,
  currentRound,
  pickNumber,
  hasAvailablePlayers,
  totalDrafted,
  totalPlayers,
  rosteredCount,
  capacity,
  rosterFullForDraft,
  isAdmin,
}: {
  draftStatus: GameDetail['draftStatus']
  currentRound: number
  pickNumber: number
  hasAvailablePlayers: boolean
  totalDrafted: number
  totalPlayers: number
  rosteredCount: number
  capacity: number
  rosterFullForDraft: boolean
  isAdmin: boolean
}) => {
  if ((draftStatus === 'pending' || draftStatus === 'ready') && !rosterFullForDraft) {
    if (capacity && rosteredCount < capacity) {
      return isAdmin
        ? `(${rosteredCount}/${capacity}) Fill roster to start.`
        : `(${rosteredCount}/${capacity}) Roster filling. Draft starts when full.`
    }
    return isAdmin
      ? 'Roster not full. Fill roster to start.'
      : 'Roster filling. Draft starts when full.'
  }
  if (draftStatus === 'in_progress') {
    if (!hasAvailablePlayers) {
      return `All players drafted · ${totalDrafted}/${totalPlayers} assigned`
    }
    return `Round ${currentRound} · Pick ${pickNumber}`
  }
  if (draftStatus === 'completed') {
    return 'Draft complete · Teams set'
  }
  if (draftStatus === 'ready') {
    return 'Captains set · Ready'
  }
  if (draftStatus === 'pending') {
    return isAdmin ? 'Roster full. Select captains to start.' : 'Roster full. Waiting for captains.'
  }
  return 'Draft status unavailable'
}

const getRoleAlert = ({
  draftStatus,
  canPick,
  isCaptain,
  isAdmin,
  nextTeamName,
  captainTeamName,
  hasAvailablePlayers,
}: {
  draftStatus: GameDetail['draftStatus']
  canPick: boolean
  isCaptain: boolean
  isAdmin: boolean
  nextTeamName: string | null
  captainTeamName: string | null
  hasAvailablePlayers: boolean
}) => {
  if (!hasAvailablePlayers) return null
  if (draftStatus === 'in_progress' && isCaptain && canPick) {
    return "You're on the clock. Make your pick."
  }
  if (
    draftStatus === 'in_progress' &&
    isCaptain &&
    !canPick &&
    captainTeamName &&
    nextTeamName &&
    captainTeamName === nextTeamName
  ) {
    return "You're next. Line up your pick."
  }
  if (draftStatus === 'in_progress' && isAdmin && !isCaptain) {
    return 'Captains are drafting. Monitor or undo picks.'
  }
  return null
}
