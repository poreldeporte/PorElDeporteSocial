import dynamic from 'next/dynamic'
import Head from 'next/head'

import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'

import { NextPageWithLayout } from '../_app'

const CreateCommunityScreen = dynamic(
  () =>
    import('app/features/community/create-screen').then(
      (module) => module.CreateCommunityScreen
    ),
  { ssr: false }
)

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

Page.getLayout = (page) => <HomeLayout layoutId={layout.id}>{page}</HomeLayout>

export default Page
