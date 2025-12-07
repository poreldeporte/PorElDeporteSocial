'use client'

import Head from 'next/head'

import { LeaderboardScreen } from 'app/features/home/leaderboard-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'

import type { NextPageWithLayout } from './_app'

const layout = getScreenLayout('leaderboard')

const Page: NextPageWithLayout = () => (
  <>
    <Head>
      <title>{layout.title}</title>
    </Head>
    <LeaderboardScreen />
  </>
)

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
