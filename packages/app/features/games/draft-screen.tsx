'use client'

import type { ScrollViewProps } from 'react-native'
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
  useToastController,
} from '@my/ui/public'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { useGameRealtimeSync } from 'app/utils/useRealtimeSync'
import { useTeamsState } from 'app/utils/useTeamsState'

import { useRouter } from 'solito/router'
import { AlertDialog } from 'tamagui'

import { StatusBadge } from './components'
import { deriveDraftViewModel } from './state/deriveDraftViewModel'
import type { GameDetail } from './types'
import { formatGameKickoffLabel } from './time-utils'

type DraftViewModel = ReturnType<typeof deriveDraftViewModel>

type DraftScreenProps = {
  gameId: string
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GameDraftScreen = ({
  gameId,
  scrollProps,
  headerSpacer,
  topInset,
}: DraftScreenProps & ScrollHeaderProps) => {
  const toast = useToastController()
  const utils = api.useUtils()
  const router = useRouter()
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
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
    draftedProfileIds,
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
  const finalizeMutation = api.teams.finalizeDraft.useMutation({
    onSuccess: async () => {
      await Promise.all([refetch(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Draft finalized')
    },
    onError: (error) => toast.show('Unable to finalize draft', { message: error.message }),
  })
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
        draftedProfileIds,
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
      draftedProfileIds,
      optimisticPicks,
      captainTeam,
      currentTurnTeam,
      isAdmin,
      isCaptainTurn,
    ]
  )

  if (!gameLoading && gameDetail && gameDetail.draftModeEnabled === false && !isAdmin) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">Draft room is hidden for this game.</Paragraph>
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
    allDrafted,
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

  const [recentPick, setRecentPick] = useState<{ teamId: string | null; profileId: string | null } | null>(null)
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
      setRecentPick({ teamId: latestPick.team_id ?? null, profileId: latestPick.profile_id ?? null })
      const timer = setTimeout(() => setRecentPick(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [events])

  useEffect(() => {
    setOptimisticPicks((prev) => {
      const filtered = prev.filter((id) =>
        availablePlayers.some((player) => player.profileId === id)
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
  const mergedContentStyle = Array.isArray(contentContainerStyle)
    ? [baseContentStyle, ...contentContainerStyle]
    : [baseContentStyle, contentContainerStyle]

  if (!gameDetail) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Paragraph theme="alt1">Game unavailable.</Paragraph>
      </YStack>
    )
  }

  const kickoffLabel = formatGameKickoffLabel(new Date(gameDetail.startTime)) || 'Kickoff TBD'

  const handlePick = (profileId: string) => {
    const teamId = captainTeam?.id ?? currentTurnTeam?.id
    if (!teamId) return
    setOptimisticPicks((prev) => (prev.includes(profileId) ? prev : [...prev, profileId]))
    pickMutation.mutate(
      { gameId, teamId, profileId },
      {
        onError: (error) => {
          toast.show('Unable to draft player', { message: error.message })
        },
        onSettled: () => {
          setOptimisticPicks((prev) => prev.filter((id) => id !== profileId))
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
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        <DraftBanner
          kickoffLabel={kickoffLabel}
          startTime={gameDetail.startTime}
          statusLabel={bannerStatus}
          totalDrafted={totalDrafted}
          totalPlayers={rosteredPlayers.length}
          isAdmin={isAdmin}
          selectionSummary={selectionSummary}
          onStartDraft={draftStatus === 'pending' && isAdmin ? handleStartDraft : undefined}
          canStartDraft={canStartDraft}
          startDraftPending={assignCaptainsMutation.isPending}
          onReset={isAdmin ? () => setResetConfirmOpen(true) : undefined}
          isResetting={resetDraftMutation.isPending}
          onFinalize={isAdmin ? () => finalizeMutation.mutate({ gameId }) : undefined}
          canFinalize={isAdmin && allDrafted && !finalizeMutation.isPending}
          finalizePending={finalizeMutation.isPending}
        />

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
          pendingProfileIds={optimisticPicks}
          readOnly={showSpectatorNotice}
          isAdmin={isAdmin}
          selectedCaptainIds={selectedCaptainIds}
          onSelectCaptain={toggleCaptain}
        />

        {isAdmin ? (
          <AdminActionsCard
            onUndo={() => undoPickMutation.mutate({ gameId })}
            canUndo={hasUndoablePick && !undoPickMutation.isPending}
            undoPending={undoPickMutation.isPending}
          />
        ) : null}

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
  )
}

const DraftBanner = ({
  kickoffLabel,
  startTime,
  statusLabel,
  totalDrafted,
  totalPlayers,
  isAdmin,
  onReset,
  isResetting,
  onFinalize,
  canFinalize,
  finalizePending,
  onStartDraft,
  canStartDraft,
  startDraftPending,
  selectionSummary,
}: {
  kickoffLabel: string
  startTime: string
  statusLabel: string
  totalDrafted: number
  totalPlayers: number
  isAdmin: boolean
  onReset?: () => void
  isResetting?: boolean
  onFinalize?: () => void
  canFinalize?: boolean
  finalizePending?: boolean
  onStartDraft?: () => void
  canStartDraft?: boolean
  startDraftPending?: boolean
  selectionSummary?: string | null
}) => {
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
      <Paragraph theme="alt2" size="$2">
        {new Date(startTime).toLocaleString()}
      </Paragraph>
      <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
        <YStack gap="$1">
          <SizableText size="$6" fontWeight="700">
            {kickoffLabel}
          </SizableText>
          <Paragraph theme="alt1">{statusLabel}</Paragraph>
          {selectionSummary ? (
            <Paragraph theme="alt2" size="$2">
              {selectionSummary}
            </Paragraph>
          ) : null}
        </YStack>
        <XStack gap="$2" flexWrap="wrap" ai="center">
          {isAdmin && onStartDraft ? (
            <Button
              size="$2"
              disabled={!canStartDraft}
              onPress={onStartDraft}
              iconAfter={startDraftPending ? <Spinner size="small" /> : undefined}
            >
              {startDraftPending ? 'Starting…' : 'Start draft with these captains'}
            </Button>
          ) : null}
          {isAdmin && onFinalize ? (
            <Button
              size="$2"
              theme="green"
              disabled={!canFinalize}
              onPress={onFinalize}
              iconAfter={finalizePending ? <Spinner size="small" /> : undefined}
            >
              {finalizePending ? 'Finalizing…' : 'Finalize'}
            </Button>
          ) : null}
          {isAdmin && onReset ? (
            <Button
              size="$2"
              theme="red"
              disabled={isResetting}
              onPress={onReset}
              iconAfter={isResetting ? <Spinner size="small" /> : undefined}
            >
              {isResetting ? 'Resetting…' : 'Reset'}
            </Button>
          ) : null}
        </XStack>
      </XStack>
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
  recentPick: { teamId: string | null; profileId: string | null } | null
}) => {
  return (
    <YStack gap="$2">
      <XStack ai="center" jc="space-between" flexWrap="wrap" gap="$2">
        <Paragraph theme="alt1" fontWeight="600">
          Teams
        </Paragraph>
        <Paragraph theme="alt2" size="$2">
          {totalDrafted}/{totalPlayers} drafted · {availableCount} available
        </Paragraph>
      </XStack>
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
  recentPick: { teamId: string | null; profileId: string | null } | null
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
            roster.map((member, index) => (
              <YStack
                key={`${member.id || member.profile_id || 'member'}-${index}`}
                gap="$1"
                px="$2"
                py="$2"
                br="$3"
                backgroundColor={
                  recentPick?.teamId === team.id && recentPick?.profileId === member.profile_id ? '$color3' : undefined
                }
              >
                <Paragraph fontWeight="600">
                  {member.profiles?.name ?? 'Member'}
                </Paragraph>
                <Paragraph theme="alt2" size="$2">
                  {typeof member.pick_order === 'number' ? `Pick #${member.pick_order}` : 'Pending pick'}
                </Paragraph>
                <Separator />
              </YStack>
            ))
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
  pendingProfileIds,
  readOnly = false,
  isAdmin,
  selectedCaptainIds,
  onSelectCaptain,
}: {
  availablePlayers: DraftViewModel['availablePlayers']
  canPick: boolean
  onPick: (profileId: string) => void
  isSyncing: boolean
  draftStatus: string
  pendingProfileIds: string[]
  readOnly?: boolean
  isAdmin: boolean
  selectedCaptainIds: string[]
  onSelectCaptain?: (profileId: string) => void
}) => {
  const hasAvailablePlayers = availablePlayers.length > 0
  return (
    <YStack gap="$3">
      <Paragraph theme="alt1" fontWeight="600">
        Available players
      </Paragraph>
      <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
        <YStack gap="$3">
          {isSyncing ? (
            <XStack ai="center" gap="$1">
              <Spinner size="small" />
              <Paragraph theme="alt2" size="$2">
                Syncing…
              </Paragraph>
            </XStack>
          ) : null}
          {hasAvailablePlayers ? (
            <YStack gap="$2">
              {availablePlayers.map((entry, index) => {
                const rowPending = pendingProfileIds.includes(entry.profileId)
                const record = entry.record ?? { wins: 0, losses: 0, recent: [] }
                const recentLabel = formatRecentRecord(record.recent)
                const overallRecord = `${record.wins}-${record.losses}`
                const positionLabel = entry.player.position || 'No position set'
                const captainIndex = selectedCaptainIds.indexOf(entry.profileId)
                const isCaptainSelected = captainIndex !== -1
                const isCaptainSelectionMode = isAdmin && draftStatus === 'pending'
                const selectionLabel = isCaptainSelected
                  ? `Captain ${captainIndex + 1}`
                  : 'Pick captain'
                const shouldShowAction =
                  isCaptainSelectionMode || (canPick && !readOnly) || (rowPending && !readOnly)
                const actionLabel = isCaptainSelectionMode
                  ? selectionLabel
                  : rowPending
                    ? 'Drafting…'
                    : 'Draft'
                return (
                  <Card
                    key={`${entry.id || entry.profileId || 'player'}-${index}`}
                    px="$3"
                    py="$2"
                    bordered
                    $platform-native={{ borderWidth: 0 }}
                    backgroundColor={rowPending ? '$color3' : '$color1'}
                  >
                    <XStack ai="center" gap="$3" flexWrap="wrap">
                      <YStack gap="$1" f={1}>
                        <Paragraph fontWeight="600">
                          {entry.player.name ?? 'Member'}
                          {entry.player.jerseyNumber ? ` · #${entry.player.jerseyNumber}` : ''}
                        </Paragraph>
                        <Paragraph theme="alt2" size="$2">
                          {positionLabel} · Record {overallRecord}
                        </Paragraph>
                        <Paragraph theme="alt2" size="$2">
                          Last 5: {recentLabel || '—'}
                        </Paragraph>
                      </YStack>
                      {/** Primary orange for live draft action */}
                    {shouldShowAction ? (
                      <Button
                        size="$2"
                        br="$10"
                        theme={isCaptainSelectionMode && isCaptainSelected ? 'active' : undefined}
                        disabled={isCaptainSelectionMode ? false : !canPick || rowPending || readOnly}
                        onPress={() => {
                          if (isCaptainSelectionMode) {
                            onSelectCaptain?.(entry.profileId)
                          } else if (canPick && !readOnly) {
                            onPick(entry.profileId)
                          }
                        }}
                        iconAfter={rowPending ? <Spinner size="small" /> : undefined}
                        style={
                          canPick && !rowPending && !readOnly && !isCaptainSelectionMode
                            ? { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary }
                            : undefined
                        }
                      >
                        {actionLabel}
                      </Button>
                    ) : null}
                  </XStack>
                </Card>
              )
              })}
            </YStack>
          ) : (
            <Paragraph theme="alt2" size="$2">
              No available players.
            </Paragraph>
          )}
        </YStack>
      </Card>
    </YStack>
  )
}

const AdminActionsCard = ({
  onUndo,
  canUndo,
  undoPending,
}: {
  onUndo: () => void
  canUndo: boolean
  undoPending: boolean
}) => (
  <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
    <YStack gap="$3">
      <SizableText size="$5" fontWeight="600">
        Admin tools
      </SizableText>
      <YStack gap="$2">
        <Button
          variant="outlined"
          disabled={!canUndo}
          onPress={onUndo}
          iconAfter={undoPending ? <Spinner size="small" /> : undefined}
        >
          {undoPending ? 'Undoing…' : 'Undo last pick'}
        </Button>
      </YStack>
    </YStack>
  </Card>
)

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

const formatRecentRecord = (recent: string[]) =>
  recent
    .slice(0, 5)
    .map((val) => (val?.toUpperCase() === 'W' ? 'W' : 'L'))
    .join(' ')
