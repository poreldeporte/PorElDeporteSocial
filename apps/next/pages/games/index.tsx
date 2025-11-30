'use client'

import { HomeLayout } from 'app/features/home/layout.web'
import { ScheduleScreen } from 'app/features/home/schedule-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import type { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('gamesList')

const Page: NextPageWithLayout = () => (
  <>
    <Head>
      <title>{layout.title}</title>
    </Head>
    <ScheduleScreen />
  </>
)

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
