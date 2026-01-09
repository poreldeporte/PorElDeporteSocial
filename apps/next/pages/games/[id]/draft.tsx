import { useState } from 'react'

import { RotateCcw } from '@tamagui/lucide-icons'
import Head from 'next/head'
import { useRouter } from 'next/router'

import { Button } from '@my/ui/public'
import { GameDraftScreen } from 'app/features/games/draft-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import { useUser } from 'app/utils/useUser'

import type { NextPageWithLayout } from '../../_app'

const layout = getScreenLayout('gameDraft')

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id
  const { isAdmin } = useUser()
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  if (!id) return null

  const headerRight = isAdmin ? (
    <Button
      chromeless
      px={0}
      py={0}
      height="$4"
      width="$4"
      aria-label="Reset draft"
      pressStyle={{ opacity: 0.7 }}
      onPress={() => setResetConfirmOpen(true)}
    >
      <RotateCcw size={22} />
    </Button>
  ) : undefined

  return (
    <HomeLayout fullPage layoutId={layout.id} headerRight={headerRight}>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <GameDraftScreen
        gameId={id}
        resetConfirmOpen={resetConfirmOpen}
        onResetConfirmOpenChange={setResetConfirmOpen}
      />
    </HomeLayout>
  )
}

Page.getLayout = (page) => page

export default Page
