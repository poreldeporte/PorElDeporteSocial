import { StyleSheet, type ScrollViewProps } from 'react-native'
import { useEffect, useState, type ReactNode } from 'react'

import {
  Button,
  Card,
  FullscreenSpinner,
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
  isWeb,
  submitButtonBaseProps,
  useToastController,
} from '@my/ui/public'
import { useRouter } from 'solito/router'

import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { getDockSpacer } from 'app/constants/dock'
import { BRAND_COLORS } from 'app/constants/colors'
import { screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { formatProfileName } from 'app/utils/profileName'
import { useTeamsState } from 'app/utils/useTeamsState'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import { ctaButtonStyles } from './cta-styles'

type Team = ReturnType<typeof useTeamsState>['teams'][number]

type Props = {
  gameId: string
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const GameResultScreen = ({
  gameId,
  scrollProps,
  headerSpacer,
  topInset,
}: Props & ScrollHeaderProps) => {
  const router = useRouter()
  const utils = api.useUtils()
  const { teams, query, isAdmin } = useTeamsState({ gameId })
  const { data: gameDetail } = api.games.byId.useQuery({ id: gameId }, { enabled: !!gameId })
  const toast = useToastController()
  const insets = useSafeAreaInsets()
  const [scoreByTeamId, setScoreByTeamId] = useState<Record<string, string>>({})
  const [hasPrefilledScores, setHasPrefilledScores] = useState(false)
  const draftStatus = query.data?.game?.draft_status ?? 'pending'
  const helperCopy = 'Enter the final score. We will pick the winner.'
  const result = gameDetail?.result ?? null
  const scoreEntries = buildScoreEntries(teams, scoreByTeamId)
  const leaderTeamId = getLeaderTeamId(scoreEntries)
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0

  const mutation = api.teams.reportResult.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.teams.state.invalidate({ gameId }), utils.games.byId.invalidate({ id: gameId })])
      router.back()
    },
    onError: (error) => {
      toast.show('Unable to submit result', { message: error.message })
    },
  })
  const canSubmit = Boolean(leaderTeamId) && draftStatus === 'completed' && !mutation.isPending

  useEffect(() => {
    if (!result || hasPrefilledScores) return
    if (Object.keys(scoreByTeamId).length) {
      setHasPrefilledScores(true)
      return
    }
    const nextScores: Record<string, string> = {}
    if (result.winningTeamId && result.winnerScore != null) {
      nextScores[result.winningTeamId] = String(result.winnerScore)
    }
    if (result.losingTeamId && result.loserScore != null) {
      nextScores[result.losingTeamId] = String(result.loserScore)
    }
    if (Object.keys(nextScores).length === 0) {
      setHasPrefilledScores(true)
      return
    }
    setScoreByTeamId(nextScores)
    setHasPrefilledScores(true)
  }, [hasPrefilledScores, result, scoreByTeamId])

  const submit = () => {
    if (draftStatus !== 'completed') {
      toast.show('Draft not finalized', { message: 'Finalize teams before reporting a result.' })
      return
    }
    const entries = buildScoreEntries(teams, scoreByTeamId)
    if (entries.length < 2) {
      toast.show('Not enough teams', { message: 'Add at least two teams to report a result.' })
      return
    }
    if (entries.some((entry) => entry.score == null)) {
      toast.show('Add all scores', { message: 'Enter a score for every team.' })
      return
    }
    const leaderId = getLeaderTeamId(entries)
    if (!leaderId) {
      toast.show('Break the tie', { message: 'Scores cannot be tied.' })
      return
    }
    const winnerEntry = entries.find((entry) => entry.team.id === leaderId)
    if (!winnerEntry) return
    const loserEntry =
      entries.length === 2 ? entries.find((entry) => entry.team.id !== leaderId) ?? null : null
    mutation.mutate({
      gameId,
      winningTeamId: leaderId,
      losingTeamId: entries.length === 2 ? loserEntry?.team.id ?? null : null,
      winnerScore: entries.length === 2 ? winnerEntry.score : null,
      loserScore: entries.length === 2 ? loserEntry?.score ?? null : null,
    })
  }

  if (query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (gameDetail?.draftModeEnabled === false) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">Draft mode is off for this game.</Paragraph>
        <Button onPress={() => router.push(`/games/${gameId}`)}>Back to game</Button>
      </YStack>
    )
  }

  if (gameDetail?.draftVisibility === 'admin_only' && !isAdmin) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">Draft room is private for admins only.</Paragraph>
        <Button onPress={() => router.push(`/games/${gameId}`)}>Back to game</Button>
      </YStack>
    )
  }

  if (!teams.length) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <Paragraph theme="alt2">Teams not ready yet. Complete the draft first.</Paragraph>
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
  const submitLabel = mutation.isPending ? 'Submitting…' : 'Submit result'

  return (
    <YStack f={1} position="relative">
      <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <YStack gap="$4">
          <YStack gap="$2">
            <SizableText size="$7" fontWeight="700">
              Report result
            </SizableText>
            <Paragraph theme="alt2">{helperCopy}</Paragraph>
            <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
          </YStack>
        <YStack gap="$3">
          <Card
            bordered
            borderColor="$black1"
            p={0}
            gap={0}
            br="$4"
            overflow="hidden"
            backgroundColor="$color1"
          >
            <YStack gap={0}>
              {teams.map((team, index) => {
                const scoreValue = scoreByTeamId[team.id] ?? ''
                const variant = leaderTeamId
                  ? team.id === leaderTeamId
                    ? 'winner'
                    : teams.length === 2
                      ? 'loser'
                      : 'neutral'
                  : 'neutral'
                return (
                  <ResultScoreCard
                    key={team.id}
                    team={team}
                    scoreValue={scoreValue}
                    variant={variant}
                    index={index}
                    onScoreChange={(value) =>
                      setScoreByTeamId((prev) => ({ ...prev, [team.id]: value }))
                    }
                  />
                )
              })}
            </YStack>
          </Card>
          {!showFloatingCta ? (
            <Button
              size="$3"
              br="$10"
              disabled={!canSubmit}
              onPress={submit}
              iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
              {...ctaButtonStyles.brandSolid}
            >
              {submitLabel}
            </Button>
          ) : null}
          {mutation.isSuccess ? (
            <Paragraph theme="alt2">
              Result submitted. Redirecting to game&hellip;
            </Paragraph>
          ) : null}
        </YStack>
          {query.data?.game?.draft_status !== 'completed' ? (
            <Card px="$4" py="$3" bordered $platform-native={{ borderWidth: 0 }}>
              <Paragraph theme="alt2">Results can be submitted once teams are finalized.</Paragraph>
            </Card>
          ) : null}
          {showFloatingCta ? <YStack h={dockSpacer} /> : null}
        </YStack>
      </ScrollView>
      {showFloatingCta ? (
        <FloatingCtaDock transparent>
          <XStack>
            <Button
              {...submitButtonBaseProps}
              disabled={!canSubmit}
              onPress={submit}
              iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
              {...ctaButtonStyles.brandSolid}
            >
              {submitLabel}
            </Button>
          </XStack>
        </FloatingCtaDock>
      ) : null}
    </YStack>
  )
}

type ScoreEntry = {
  team: Team
  score: number | null
}

const parseScore = (value: string | undefined) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

const buildScoreEntries = (teams: Team[], scoreByTeamId: Record<string, string>) =>
  teams.map((team) => ({
    team,
    score: parseScore(scoreByTeamId[team.id]),
  }))

const getLeaderTeamId = (entries: ScoreEntry[]) => {
  if (entries.length < 2) return null
  if (entries.some((entry) => entry.score == null)) return null
  const sorted = [...entries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  if (!sorted.length || sorted[0].score === sorted[1].score) return null
  return sorted[0].team.id
}

type ResultTeamVariant = 'winner' | 'loser' | 'neutral'

const getTeamTone = (variant: ResultTeamVariant) =>
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

const ResultScoreCard = ({
  team,
  scoreValue,
  variant,
  index,
  onScoreChange,
}: {
  team: Team
  scoreValue: string
  variant: ResultTeamVariant
  index: number
  onScoreChange: (value: string) => void
}) => {
  const tone = getTeamTone(variant)
  const roster =
    (team.game_team_members ?? []).map((member, index) => ({
      key: member.profile_id ?? member.id ?? `${team.id}-${index}`,
      name: formatProfileName(member.profiles, 'Player') ?? 'Player',
      isCaptain: member.profile_id === team.captain_profile_id,
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
        <Input
          keyboardType="numeric"
          inputMode="numeric"
          placeholder="0"
          value={scoreValue}
          onChangeText={onScoreChange}
          textAlign="center"
          w={72}
          fontSize={28}
          fontWeight="900"
          color={tone.scoreColor as any}
          borderColor={tone.borderColor as any}
          backgroundColor="$background"
        />
      </XStack>
      <XStack gap="$1" flexWrap="wrap">
        {roster.map(({ key, name, isCaptain }) => (
          <XStack
            key={key}
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
        ))}
      </XStack>
    </YStack>
  )
}
