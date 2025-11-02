import { HomeLayout } from 'app/features/home/layout.web'
import { HomeScreen } from 'app/features/home/screen'
import Head from 'next/head'

import type { NextPageWithLayout } from './_app'

export const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <HomeScreen />
    </>
  )
}

Page.getLayout = (page) => <HomeLayout>{page}</HomeLayout>

export default Page
