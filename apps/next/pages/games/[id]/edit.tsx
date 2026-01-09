import { Trash } from '@tamagui/lucide-icons'
import Head from 'next/head'
import { useRouter } from 'next/router'

import { Button, useToastController } from '@my/ui/public'
import { GameEditScreen } from 'app/features/games/edit-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import { api } from 'app/utils/api'
import { useUser } from 'app/utils/useUser'

import type { NextPageWithLayout } from '../../_app'

const layout = getScreenLayout('gameEdit')

const GameEditHeaderRight = () => {
  const { isAdmin } = useUser()
  const router = useRouter()
  const toast = useToastController()
  const utils = api.useUtils()
  const deleteMutation = api.games.delete.useMutation({
    onSuccess: async () => {
      await utils.games.list.invalidate()
      toast.show('Game deleted')
      router.replace('/games')
    },
    onError: (error) => {
      toast.show('Unable to delete game', { message: error.message })
    },
  })
  const id = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id
  if (!isAdmin || !id) return null
  const handleDelete = () => {
    if (!id || deleteMutation.isPending) return
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Delete game?\n\nThis removes the game and all related data. This cannot be undone.'
      )
      if (!confirmed) return
    }
    deleteMutation.mutate({ id })
  }
  return (
    <Button
      chromeless
      px={0}
      py={0}
      height="$4"
      width="$4"
      aria-label="Delete game"
      pressStyle={{ opacity: 0.7 }}
      disabled={deleteMutation.isPending}
      onPress={handleDelete}
    >
      <Trash size={24} />
    </Button>
  )
}

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id

  if (!id) return null

  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <GameEditScreen gameId={id} />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id} headerRight={<GameEditHeaderRight />}>
    {page}
  </HomeLayout>
)

export default Page
