import { HomeLayout } from 'app/features/home/layout.web'
import { ProfileScreen } from 'app/features/profile/screen'
import Head from 'next/head'

import type { NextPageWithLayout } from '../_app'

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <ProfileScreen />
    </>
  )
}

Page.getLayout = (page) => <HomeLayout fullPage>{page}</HomeLayout>

export default Page
