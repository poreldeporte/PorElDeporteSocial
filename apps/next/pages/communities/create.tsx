import { CreateCommunityScreen } from 'app/features/community/create-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('community')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Create community</title>
      </Head>
      <CreateCommunityScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
