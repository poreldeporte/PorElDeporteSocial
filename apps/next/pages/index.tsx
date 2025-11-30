import { HomeLayout } from 'app/features/home/layout.web'
import { HomeScreen } from 'app/features/home/screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import type { NextPageWithLayout } from './_app'

const layout = getScreenLayout('tabsRoot')

export const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <HomeScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
