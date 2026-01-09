import Head from 'next/head'
import { useRouter } from 'next/router'

import { GameReviewsScreen } from 'app/features/games/reviews-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import type { NextPageWithLayout } from '../../_app'

const gameReviewsLayout = getScreenLayout('gameReviews')

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id

  if (!id) {
    return null
  }

  return (
    <HomeLayout fullPage layoutId={gameReviewsLayout.id}>
      <Head>
        <title>{gameReviewsLayout.title}</title>
      </Head>
      <GameReviewsScreen gameId={id} />
    </HomeLayout>
  )
}

Page.getLayout = (page) => page

export default Page
