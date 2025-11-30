import { LeaderboardScreen } from 'app/features/home/leaderboard-screen'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Leaderboard',
        }}
      />
      <LeaderboardScreen />
    </>
  )
}
