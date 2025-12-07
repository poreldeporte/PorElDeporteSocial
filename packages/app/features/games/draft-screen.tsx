'use client'

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
import { api } from 'app/utils/api'
import { useTeamsState } from 'app/utils/useTeamsState'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertDialog } from 'tamagui'
import { CaptainSelector, StatusBadge } from './components'
import { screenContentContainerStyle } from 'app/constants/layout'
import { deriveDraftViewModel } from './state/deriveDraftViewModel'
import type { GameDetail } from './types'
import { formatGameKickoffLabel } from './time-utils'

type DraftViewModel = ReturnType<typeof deriveDraftViewModel>

type DraftScreenProps = {
  gameId: string
}

export const GameDraftScreen = ({ gameId }: DraftScreenProps) => {
  const toast = useToastController()
  const utils = api.useUtils()
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [optimisticPicks, setOptimisticPicks] = useState<string[]>([])
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
  const resetDraftMutation = api.teams.resetDraft.useMutation({
    onSuccess: async () => {
      setResetConfirmOpen(false)
      await Promise.all([refetch(), utils.games.byId.invalidate({ id: gameId })])
      toast.show('Draft reset')
    },
    onError: (error) => toast.show('Unable to reset draft', { message: error.message }),
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
  const {
    draftStatus,
    captains,
    confirmedRoster,
    confirmedPlayers,
    availablePlayers,
    totalDrafted,
    allDrafted,
    hasCaptains,
    canPick,
    captainNameByTeamId,
    pickNumberWithPending,
    currentRound,
    nextTeamName,
    currentCaptainTeam,
  } = draftView

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

  const formatCaptainName = useCallback(
    (teamId: string | null | undefined) => {
      if (!teamId) return null
      const captainName = captainNameByTeamId.get(teamId)
      if (!captainName) return null
      const [firstName] = captainName.split(' ')
      return firstName ?? captainName
    },
    [captainNameByTeamId]
  )

  if (gameLoading || query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <FullscreenSpinner />
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
    currentCaptainName: formatCaptainName(currentTurnTeam?.id),
    currentRound,
    pickNumber: pickNumberWithPending,
    hasAvailablePlayers,
    totalDrafted,
    totalPlayers: confirmedPlayers.length,
  })
  const teamsStatusCopy = buildStatusCopy(draftStatus, hasCaptains, hasAvailablePlayers)
  const showSpectatorNotice = !isAdmin && !isCaptain
  return (
    <ScrollView contentContainerStyle={screenContentContainerStyle}>
      <YStack gap="$4">
        <DraftBanner
          kickoffLabel={kickoffLabel}
          startTime={gameDetail.startTime}
          statusLabel={bannerStatus}
          totalDrafted={totalDrafted}
          totalPlayers={confirmedPlayers.length}
          isAdmin={isAdmin}
          onReset={isAdmin ? () => setResetConfirmOpen(true) : undefined}
          isResetting={resetDraftMutation.isPending}
          onFinalize={isAdmin ? () => finalizeMutation.mutate({ gameId }) : undefined}
          canFinalize={isAdmin && allDrafted && !finalizeMutation.isPending}
          finalizePending={finalizeMutation.isPending}
        />

        {isAdmin && draftStatus === 'pending' ? (
          <CaptainSelector
            gameId={gameDetail.id}
            confirmedPlayers={confirmedRoster}
            captains={captains}
          />
        ) : null}

        {draftStatus === 'pending' && !hasCaptains ? (
          <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
            <Paragraph theme="alt2">
              Captains need to be assigned before the draft can start. An admin can select two confirmed players.
            </Paragraph>
          </Card>
        ) : null}

        <TeamsSection
          teams={teams}
          captains={captains}
          currentTurnTeamId={currentTurnTeam?.id ?? null}
          draftStatus={draftStatus}
          totalDrafted={totalDrafted}
          totalPlayers={confirmedPlayers.length}
          availableCount={availablePlayers.length}
          statusCopy={teamsStatusCopy}
          recentPick={recentPick}
          hasAvailablePlayers={hasAvailablePlayers}
        />

        {roleAlertMessage ? <RoleAlert message={roleAlertMessage} /> : null}

        <AvailablePlayersSection
          availablePlayers={availablePlayers}
          totalDrafted={totalDrafted}
          totalPlayers={confirmedPlayers.length}
          canPick={canPick}
          onPick={handlePick}
          isSyncing={isSyncing}
          currentCaptainName={formatCaptainName(currentTurnTeam?.id)}
          draftStatus={draftStatus}
          currentRound={currentRound}
          pickNumber={pickNumberWithPending}
          pendingProfileIds={optimisticPicks}
          hasAvailablePlayers={hasAvailablePlayers}
          readOnly={showSpectatorNotice}
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
            animation="medium"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            o={0.5}
            backgroundColor="$color5"
          />
          <AlertDialog.Content
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
              This clears captains, teams, and picks so you can start over. Players will remain confirmed in the game
              queue.
            </AlertDialog.Description>
            <XStack gap="$3">
              <AlertDialog.Cancel asChild>
                <Button flex={1} theme="alt1" onPress={() => setResetConfirmOpen(false)}>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  flex={1}
                  theme="red"
                  onPress={() => resetDraftMutation.mutate({ gameId })}
                  disabled={resetDraftMutation.isPending}
                  iconAfter={resetDraftMutation.isPending ? <Spinner size="small" /> : undefined}
                >
                  {resetDraftMutation.isPending ? 'Resetting…' : 'Reset draft'}
                </Button>
              </AlertDialog.Action>
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
        </YStack>
        <XStack gap="$2" flexWrap="wrap" ai="center">
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
  statusCopy,
  recentPick,
  hasAvailablePlayers,
}: {
  teams: DraftTeam[]
  captains: GameDetail['captains']
  currentTurnTeamId: string | null
  draftStatus: string
  totalDrafted: number
  totalPlayers: number
  availableCount: number
  statusCopy: string
  recentPick: { teamId: string | null; profileId: string | null } | null
  hasAvailablePlayers: boolean
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
      <Paragraph theme="alt2" size="$2">
        {hasAvailablePlayers ? statusCopy : 'All confirmed players have been drafted.'}
      </Paragraph>
      <XStack gap="$3" flexWrap="wrap">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
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
      const pickA = typeof a.pick_order === 'number' ? a.pick_order : Number.MAX_SAFE_INT
      const pickB = typeof b.pick_order === 'number' ? b.pick_order : Number.MAX_SAFE_INT
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
            <StatusBadge tone="success" showIcon={false}>
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
            {captain?.player.jerseyNumber ? ` · #${captain.player.jerseyNumber}` : ''}
          </Paragraph>
        </YStack>
        <Separator />
        <YStack gap="$2">
          {roster.length ? (
            roster.map((member) => (
              <YStack
                key={member.id}
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
                  {member.profiles?.jersey_number ? ` · #${member.profiles.jersey_number}` : ''}
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
  totalDrafted,
  totalPlayers,
  canPick,
  onPick,
  isSyncing,
  currentCaptainName,
  draftStatus,
  currentRound,
  pickNumber,
  pendingProfileIds,
  hasAvailablePlayers,
  readOnly = false,
}: {
  availablePlayers: DraftViewModel['availablePlayers']
  totalDrafted: number
  totalPlayers: number
  canPick: boolean
  onPick: (profileId: string) => void
  isSyncing: boolean
  currentCaptainName?: string | null
  draftStatus: string
  currentRound: number
  pickNumber: number
  pendingProfileIds: string[]
  hasAvailablePlayers: boolean
  readOnly?: boolean
}) => (
  <YStack gap="$3">
    <Paragraph theme="alt1" fontWeight="600">
      Available players
    </Paragraph>
    <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
      <YStack gap="$3">
        <XStack ai="center" jc="space-between" flexWrap="wrap" gap="$2">
          <YStack gap="$1">
            <SizableText size="$5" fontWeight="600">
              Remaining ({availablePlayers.length})
            </SizableText>
            <Paragraph theme="alt2" size="$2">
              {totalDrafted}/{totalPlayers} drafted
            </Paragraph>
          </YStack>
          {isSyncing ? (
            <XStack ai="center" gap="$1">
              <Spinner size="small" />
              <Paragraph theme="alt2" size="$2">
                Syncing…
              </Paragraph>
            </XStack>
          ) : null}
        </XStack>
        <Paragraph theme="alt2" size="$2">
          {draftStatus === 'in_progress'
            ? hasAvailablePlayers
              ? currentCaptainName
                ? `${currentCaptainName} is on the clock · Round ${currentRound} · Pick ${pickNumber}`
                : `Round ${currentRound} · Pick ${pickNumber}`
              : 'All confirmed players have been drafted.'
            : draftStatus === 'completed'
              ? 'Draft complete. Review teams above.'
              : 'Draft begins once captains are ready.'}
        </Paragraph>
        {!hasAvailablePlayers ? (
          <Paragraph theme="alt1">All confirmed players have been drafted.</Paragraph>
        ) : (
          <YStack gap="$2">
            {availablePlayers.map((entry) => {
              const rowPending = pendingProfileIds.includes(entry.profileId)
              const record = entry.record ?? { wins: 0, losses: 0, recent: [] }
              const recentLabel = formatRecentRecord(record.recent)
              const overallRecord = `${record.wins}-${record.losses}`
              const positionLabel = entry.player.position || 'No position set'
              return (
                <Card
                  key={entry.id}
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
                    <Button
                      size="$2"
                      disabled={!canPick || rowPending || readOnly}
                      onPress={() => onPick(entry.profileId)}
                      iconAfter={rowPending ? <Spinner size="small" /> : undefined}
                    >
                      {rowPending ? 'Drafting…' : canPick && !readOnly ? 'Draft' : 'Waiting'}
                    </Button>
                  </XStack>
                </Card>
              )
            })}
          </YStack>
        )}
      </YStack>
    </Card>
  </YStack>
)

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
        Captains are set. Draft opens once both are in the locker room.
      </Paragraph>
    )
  }
  return (
    <Paragraph theme="alt2" size="$3">
      Captains haven’t opened the draft yet. We’ll ping you when picks start.
    </Paragraph>
  )
}

const buildBannerStatus = ({
  draftStatus,
  currentCaptainName,
  currentRound,
  pickNumber,
  hasAvailablePlayers,
  totalDrafted,
  totalPlayers,
}: {
  draftStatus: GameDetail['draftStatus']
  currentCaptainName?: string | null
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
    return currentCaptainName
      ? `Round ${currentRound} · Pick ${pickNumber} — ${currentCaptainName} on the clock`
      : `Round ${currentRound} · Pick ${pickNumber}`
  }
  if (draftStatus === 'completed') {
    return 'Draft complete · Teams locked'
  }
  if (draftStatus === 'ready') {
    return 'Captains locked · Draft begins when both are ready'
  }
  if (draftStatus === 'pending') {
    return 'Waiting for captains to be assigned'
  }
  return 'Draft status unavailable'
}

const buildStatusCopy = (
  draftStatus: GameDetail['draftStatus'],
  hasCaptains: boolean,
  hasAvailablePlayers: boolean
) => {
  if (!hasCaptains && draftStatus === 'pending') {
    return 'Assign two captains to start drafting.'
  }
  if (draftStatus === 'ready') {
    return 'Captains confirmed—draft kicks off when they enter the room.'
  }
  if (draftStatus === 'in_progress') {
    return hasAvailablePlayers
      ? 'Draft is live. Captains tap a player below to pick instantly.'
      : 'All players drafted. Awaiting admin finalize.'
  }
  if (draftStatus === 'completed') {
    return 'Draft complete. Review teams before kickoff.'
  }
  return 'Draft setup in progress.'
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
