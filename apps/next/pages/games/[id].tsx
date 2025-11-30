import { HomeLayout } from 'app/features/home/layout.web'
import { GameDetailScreen } from 'app/features/games/detail-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'
import { useRouter } from 'next/router'
import type { NextPageWithLayout } from '../_app'

const gameDetailLayout = getScreenLayout('gameDetail')

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id

  if (!id) {
    return null
  }

  return (
    <HomeLayout fullPage layoutId={gameDetailLayout.id}>
      <Head>
        <title>{gameDetailLayout.title}</title>
      </Head>
      <GameDetailScreen gameId={id} />
    </HomeLayout>
  )
}

Page.getLayout = (page) => page

export default Page
