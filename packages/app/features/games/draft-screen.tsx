'use client'

import { StyleSheet, type ScrollViewProps } from 'react-native'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  Button,
  Card,
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

import { Undo2 } from '@tamagui/lucide-icons'
import { useRouter } from 'solito/router'
import { AlertDialog } from 'tamagui'

import { DraftRoomLiveOverlay, SectionTitle, StatusBadge, getDraftChatDockInset } from './components'
import { RecentFormChips } from './components/RecentFormChips'
import { deriveDraftViewModel } from './state/deriveDraftViewModel'
import { canAdminAccessDraftRoom, canPlayerAccessDraftRoom, resolveDraftVisibility } from './draft-visibility'
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
  const [localResetConfirmOpen, setLocalResetConfirmOpen] = useState(false)
  const resetConfirmOpen = resetConfirmOpenProp ?? localResetConfirmOpen
  const setResetConfirmOpen = onResetConfirmOpenChange ?? setLocalResetConfirmOpen
  const [optimisticPicks, setOptimisticPicks] = useState<string[]>([])
  const [selectedCaptainIds, setSelectedCaptainIds] = useState<string[]>([])
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

  if (!gameLoading && gameDetail && !canAccessDraftRoom) {
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

  if (gameLoading || query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
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
    gameDetail && gameDetail.draftModeEnabled !== false && gameDetail.draftChatEnabled !== false
  )
  const chatDockInset = draftChatEnabled ? getDraftChatDockInset(insets.bottom ?? 0) : 0
  const paddedContentStyle = chatDockInset
    ? {
        ...mergedContentStyle,
        paddingBottom: Math.max(mergedContentStyle?.paddingBottom ?? 0, chatDockInset),
      }
    : mergedContentStyle

  if (!gameDetail) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Paragraph theme="alt1">Game unavailable.</Paragraph>
      </YStack>
    )
  }

  const kickoffLabel = formatGameKickoffLabel(new Date(gameDetail.startTime)) || 'Kickoff TBD'

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

  const isSyncing = query.isFetching || pickMutation.isPending
  const hasAvailablePlayers = availablePlayers.length > 0
  const captainTeamName = captainTeam?.name ?? currentCaptainTeam?.name ?? null
  const roleAlertMessage = getRoleAlert({
    draftStatus,
    canPick,
    isCaptain,
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
  })
  const showSpectatorNotice = !isAdmin && !isCaptain
  const canStartDraft =
    isAdmin && draftStatus === 'pending' && isValidCaptainCount && !assignCaptainsMutation.isPending
  const selectionSummary =
    isAdmin && draftStatus === 'pending'
      ? selectedCaptainCount === 0
        ? 'Pick captains below to start the draft.'
        : isValidCaptainCount
          ? `Selected ${selectedCaptainCount} captains · Teams of ${captainTeamSize}`
          : `Selected ${selectedCaptainCount} captains · Must divide ${rosteredCount} roster`
      : null
  const startDraftDisabled = !canStartDraft
  const startDraftStyle = startDraftDisabled
    ? { backgroundColor: '$color4', borderColor: '$color4', color: '$color11' }
    : { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary, color: '$background' }

  const toggleCaptain = (profileId: string) => {
    if (draftStatus !== 'pending' || !isAdmin) return
    setSelectedCaptainIds((prev) => {
      const existingIndex = prev.indexOf(profileId)
      if (existingIndex !== -1) {
        return prev.filter((id) => id !== profileId)
      }
      return [...prev, profileId]
    })
  }

  const handleStartDraft = () => {
    if (!canStartDraft) return
    assignCaptainsMutation.mutate({
      gameId,
      captains: selectedCaptainIds.map((profileId) => ({ profileId })),
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
          {draftStatus === 'pending' && isAdmin ? (
            <Button
              {...submitButtonBaseProps}
              disabled={startDraftDisabled}
              {...startDraftStyle}
              onPress={handleStartDraft}
              iconAfter={
                assignCaptainsMutation.isPending ? <Spinner size="small" color="$background" /> : undefined
              }
              o={startDraftDisabled ? 0.7 : 1}
            >
              {assignCaptainsMutation.isPending ? 'Starting…' : 'Start draft'}
            </Button>
          ) : null}

          <TeamsSection
            teams={teams}
            captains={captains}
            currentTurnTeamId={currentTurnTeam?.id ?? null}
            draftStatus={draftStatus}
            totalDrafted={totalDrafted}
            totalPlayers={rosteredPlayers.length}
            availableCount={availablePlayers.length}
            recentPick={recentPick}
          />

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
          />

          {showSpectatorNotice && draftStatus !== 'completed' ? (
            <SpectatorNotice draftStatus={draftStatus} />
          ) : null}
        </YStack>

        <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay
              key="overlay"
              animation="medium"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
              o={0.5}
              backgroundColor="$color5"
            />
            <AlertDialog.Content
              key="content"
              elevate
              animation="medium"
              enterStyle={{ opacity: 0, scale: 0.95 }}
              exitStyle={{ opacity: 0, scale: 0.95 }}
              backgroundColor="$color2"
              br="$4"
              p="$4"
              gap="$3"
            >
              <AlertDialog.Title fontWeight="700">Reset draft?</AlertDialog.Title>
              <AlertDialog.Description>
                This clears captains, teams, and picks so you can start over. Players will remain rostered in the game
                queue.
              </AlertDialog.Description>
              <XStack gap="$3">
                <Button flex={1} theme="alt1" onPress={() => setResetConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  flex={1}
                  theme="red"
                  onPress={() => resetDraftMutation.mutate({ gameId })}
                  disabled={resetDraftMutation.isPending}
                  iconAfter={resetDraftMutation.isPending ? <Spinner size="small" /> : undefined}
                >
                  {resetDraftMutation.isPending ? 'Resetting…' : 'Reset draft'}
                </Button>
              </XStack>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog>
      </ScrollView>
      <DraftRoomLiveOverlay
        gameId={gameId}
        enabled={draftChatEnabled}
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
      borderColor="$color4"
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

const TeamsSection = ({
  teams,
  captains,
  currentTurnTeamId,
  draftStatus,
  totalDrafted,
  totalPlayers,
  availableCount,
  recentPick,
}: {
  teams: DraftTeam[]
  captains: GameDetail['captains']
  currentTurnTeamId: string | null
  draftStatus: string
  totalDrafted: number
  totalPlayers: number
  availableCount: number
  recentPick: { teamId: string | null; playerId: string | null } | null
}) => {
  return (
    <YStack gap="$2">
      <SectionTitle meta={`${totalDrafted}/${totalPlayers} drafted · ${availableCount} available`}>
        Teams
      </SectionTitle>
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
          />
        ))}
      </XStack>
    </YStack>
  )
}

const TeamCard = ({
  team,
  captain,
  isActive,
  draftStatus,
  recentPick,
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
              Locked
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
}) => {
  const isCaptainSelectionMode = isAdmin && draftStatus === 'pending'
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
  const dialogButtonProps = {
    size: '$3',
    br: '$10',
    fontWeight: '600',
    pressStyle: { opacity: 0.85 },
  } as const
  const confirmButtonStyle = {
    backgroundColor: BRAND_COLORS.primary,
    borderColor: BRAND_COLORS.primary,
    color: '$background',
  } as const
  if (!hasAvailablePlayers && !isSyncing) {
    return null
  }
  return (
    <YStack gap="$3">
      <SectionTitle>Available players</SectionTitle>
      <Card bordered borderColor="$black1" p={0} gap={0} overflow="visible">
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
                const captainIndex = entry.profileId
                  ? selectedCaptainIds.indexOf(entry.profileId)
                  : -1
                const isCaptainSelected = captainIndex !== -1
                const isSelected = isCaptainSelectionMode && isCaptainSelected
                const rowBackgroundColor = rowPending
                  ? '$color3'
                  : isSelected
                    ? '$background'
                    : undefined
                const rowBorderColor = isSelected ? '$borderColor' : '$black1'
                const canSelectCaptain = isCaptainSelectionMode && Boolean(entry.profileId)
                const canDraftPlayer = !isCaptainSelectionMode && canPick && !readOnly
                const canInteract = !rowPending && (canSelectCaptain || canDraftPlayer)
                return (
                  <YStack
                    key={`${entry.id || entry.profileId || 'player'}-${index}`}
                    px="$3"
                    py="$2"
                    borderTopWidth={index === 0 ? 0 : 1}
                    borderColor={rowBorderColor}
                    backgroundColor={rowBackgroundColor}
                    themeInverse={isSelected}
                    pressStyle={
                      canInteract
                        ? { backgroundColor: isSelected ? '$backgroundPress' : '$color2' }
                        : undefined
                    }
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
                          <XStack ai="center" gap="$2">
                            <SizableText fontWeight="600" numberOfLines={1} flex={1} minWidth={0}>
                              {name}
                            </SizableText>
                            <Paragraph theme="alt2" size="$2" flexShrink={0}>
                              ({recordLabel})
                            </Paragraph>
                          </XStack>
                          {!entry.isGuest ? <RecentFormChips recentForm={recentForm} /> : null}
                        </YStack>
                      </XStack>
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
      <AlertDialog
        open={Boolean(pendingPick)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPick(null)
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            key="overlay"
            animation="medium"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            o={0.5}
            backgroundColor="$color5"
          />
          <AlertDialog.Content
            key="content"
            elevate
            animation="medium"
            enterStyle={{ opacity: 0, scale: 0.95 }}
            exitStyle={{ opacity: 0, scale: 0.95 }}
            backgroundColor="$color2"
            br="$4"
            p="$4"
            gap="$3"
          >
            <AlertDialog.Title fontWeight="700">Confirm pick?</AlertDialog.Title>
            <AlertDialog.Description>
              {confirmPickName} will be drafted to your team.
            </AlertDialog.Description>
            <XStack gap="$3">
              <Button
                {...dialogButtonProps}
                flex={1}
                variant="outlined"
                onPress={() => setPendingPick(null)}
              >
                Cancel
              </Button>
              <Button
                {...dialogButtonProps}
                flex={1}
                onPress={() => {
                  if (pendingPick) {
                    onPick(pendingPick)
                  }
                  setPendingPick(null)
                }}
                disabled={!pendingPick}
                {...confirmButtonStyle}
              >
                Draft player
              </Button>
            </XStack>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog>
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
        Captains are set. Draft starting now.
      </Paragraph>
    )
  }
  return (
    <Paragraph theme="alt2" size="$3">
      Captains haven’t been assigned yet. We’ll ping you when picks start.
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
}: {
  draftStatus: GameDetail['draftStatus']
  currentRound: number
  pickNumber: number
  hasAvailablePlayers: boolean
  totalDrafted: number
  totalPlayers: number
}) => {
  if (draftStatus === 'in_progress') {
    if (!hasAvailablePlayers) {
      return `All players drafted · ${totalDrafted}/${totalPlayers} assigned`
    }
    return `Round ${currentRound} · Pick ${pickNumber}`
  }
  if (draftStatus === 'completed') {
    return 'Draft complete · Teams locked'
  }
  if (draftStatus === 'ready') {
    return 'Captains set · Draft starting now'
  }
  if (draftStatus === 'pending') {
    return 'Waiting for captains to be assigned'
  }
  return 'Draft status unavailable'
}

const getRoleAlert = ({
  draftStatus,
  canPick,
  isCaptain,
  nextTeamName,
  captainTeamName,
  hasAvailablePlayers,
}: {
  draftStatus: GameDetail['draftStatus']
  canPick: boolean
  isCaptain: boolean
  nextTeamName: string | null
  captainTeamName: string | null
  hasAvailablePlayers: boolean
}) => {
  if (!hasAvailablePlayers) return null
  if (draftStatus === 'in_progress' && isCaptain && canPick) {
    return 'You’re on the clock. Draft a player now.'
  }
  if (
    draftStatus === 'in_progress' &&
    isCaptain &&
    !canPick &&
    captainTeamName &&
    nextTeamName &&
    captainTeamName === nextTeamName
  ) {
    return 'You’re up next. Line up your pick.'
  }
  return null
}
