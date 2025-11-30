'use client'

import { HomeLayout } from 'app/features/home/layout.web'
import { ShopScreen } from 'app/features/shop'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import type { NextPageWithLayout } from './_app'

const layout = getScreenLayout('shop')

const Page: NextPageWithLayout = () => (
  <>
    <Head>
      <title>{layout.title}</title>
    </Head>
    <ShopScreen />
  </>
)

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page

