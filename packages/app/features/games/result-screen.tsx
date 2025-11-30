import {
  Button,
  Card,
  FullscreenSpinner,
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  YStack,
  useToastController,
} from '@my/ui'
import { useRouter } from 'solito/router'
import { api } from 'app/utils/api'
import { useTeamsState } from 'app/utils/useTeamsState'
import { useState } from 'react'

type Props = {
  gameId: string
}

export const GameResultScreen = ({ gameId }: Props) => {
  const router = useRouter()
  const utils = api.useUtils()
  const { teams, query } = useTeamsState({ gameId })
  const toast = useToastController()
  const [winningTeamId, setWinningTeamId] = useState<string | null>(null)
  const [losingTeamId, setLosingTeamId] = useState<string | null>(null)
  const [winnerScore, setWinnerScore] = useState('')
  const [loserScore, setLoserScore] = useState('')
  const draftStatus = query.data?.game?.draft_status ?? 'pending'

  const mutation = api.teams.reportResult.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.teams.state.invalidate({ gameId }), utils.games.byId.invalidate({ id: gameId })])
      router.push(`/games/${gameId}`)
    },
    onError: (error) => {
      toast.show('Unable to submit result', { message: error.message })
    },
  })

  const submit = () => {
    if (draftStatus !== 'completed') {
      toast.show('Draft not finalized', { message: 'Finalize teams before reporting a result.' })
      return
    }
    if (!winningTeamId) return
    mutation.mutate({
      gameId,
      winningTeamId,
      losingTeamId: losingTeamId ?? teams.find((team) => team.id !== winningTeamId)?.id,
      winnerScore: winnerScore ? Number(winnerScore) : null,
      loserScore: loserScore ? Number(loserScore) : null,
    })
  }

  if (query.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center">
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (!teams.length) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Paragraph theme="alt2">Teams not ready yet. Complete the draft first.</Paragraph>
      </YStack>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <YStack gap="$4">
        <Card px="$4" py="$4" bordered $platform-native={{ borderWidth: 0 }}>
          <YStack gap="$3">
            <SizableText size="$6" fontWeight="700">
              Report result
            </SizableText>
            <Paragraph theme="alt2">Select the winning team and optionally add the score.</Paragraph>
            <YStack gap="$2">
              {teams.map((team) => (
                <Button
                  key={team.id}
                  theme={winningTeamId === team.id ? 'active' : 'alt1'}
                  onPress={() => {
                    setWinningTeamId(team.id)
                    setLosingTeamId(teams.find((t) => t.id !== team.id)?.id ?? null)
                  }}
                >
                  {team.name}
                </Button>
              ))}
            </YStack>

            <YStack gap="$2">
              <Paragraph theme="alt1">Scores (optional)</Paragraph>
              <Input
                keyboardType="numeric"
                placeholder="Winner score"
                value={winnerScore}
                onChangeText={setWinnerScore}
              />
              <Input
                keyboardType="numeric"
                placeholder="Loser score"
                value={loserScore}
                onChangeText={setLoserScore}
              />
            </YStack>

            <Button
              disabled={!winningTeamId || mutation.isPending || draftStatus !== 'completed'}
              onPress={submit}
              iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit result'}
            </Button>
            {mutation.isSuccess ? (
              <Paragraph theme="alt2">
                Result submitted. Redirecting to game&hellip;
              </Paragraph>
            ) : null}
          </YStack>
        </Card>
        {query.data?.game?.draft_status !== 'completed' ? (
          <Paragraph theme="alt2">Results can be submitted once teams are finalized.</Paragraph>
        ) : null}
      </YStack>
    </ScrollView>
  )
}
