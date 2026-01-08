import { Star } from '@tamagui/lucide-icons'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Link } from 'solito/link'

import { Button } from '@my/ui/public'
import { GameDetailScreen } from 'app/features/games/detail-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import { useUser } from 'app/utils/useUser'

import type { NextPageWithLayout } from '../_app'

const gameDetailLayout = getScreenLayout('gameDetail')

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id
  const { role } = useUser()
  const isAdmin = role === 'admin'

  if (!id) {
    return null
  }

  const headerRight = isAdmin ? (
    <Link href={`/games/${id}/reviews`}>
      <Button chromeless p="$1" aria-label="Game reviews" pressStyle={{ opacity: 0.7 }}>
        <Star size={20} />
      </Button>
    </Link>
  ) : undefined

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
