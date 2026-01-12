import { PenSquare, Star } from '@tamagui/lucide-icons'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Link } from 'solito/link'

import { Button } from '@my/ui/public'
import { GameDetailScreen } from 'app/features/games/detail-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import { api } from 'app/utils/api'
import { useUser } from 'app/utils/useUser'

import type { NextPageWithLayout } from '../_app'

const gameDetailLayout = getScreenLayout('gameDetail')

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id
  const { isAdmin } = useUser()
  const reviewsQuery = api.reviews.listByGame.useQuery(
    { gameId: id ?? '' },
    { enabled: isAdmin && Boolean(id) }
  )
  const hasReviews = (reviewsQuery.data?.summary.count ?? 0) > 0

  if (!id) {
    return null
  }

  const headerRight =
    isAdmin ? (
      <>
        <Link href={`/games/${id}/edit`}>
          <Button
            chromeless
            px={0}
            py={0}
            height="$4"
            width="$4"
            aria-label="Edit game"
            pressStyle={{ opacity: 0.7 }}
          >
            <PenSquare size={22} />
          </Button>
        </Link>
        {hasReviews ? (
          <Link href={`/games/${id}/reviews`}>
            <Button
              chromeless
              px={0}
              py={0}
              height="$4"
              width="$4"
              aria-label="View reviews"
              pressStyle={{ opacity: 0.7 }}
            >
              <Star size={22} />
            </Button>
          </Link>
        ) : null}
      </>
    ) : null

  return (
    <HomeLayout fullPage layoutId={gameDetailLayout.id} headerRight={headerRight}>
      <Head>
        <title>{gameDetailLayout.title}</title>
      </Head>
      <GameDetailScreen gameId={id} />
    </HomeLayout>
  )
}

Page.getLayout = (page) => page

export default Page
