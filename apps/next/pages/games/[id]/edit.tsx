import { HomeLayout } from 'app/features/home/layout.web'
import { GameEditScreen } from 'app/features/games/edit-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'
import { useRouter } from 'next/router'

import type { NextPageWithLayout } from '../../_app'

const layout = getScreenLayout('gameEdit')

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
  <HomeLayout fullPage layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
