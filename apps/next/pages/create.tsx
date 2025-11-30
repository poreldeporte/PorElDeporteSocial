import { CreateScreen } from 'app/features/create/screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import { NextPageWithLayout } from './_app'

const layout = getScreenLayout('create')

export const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <CreateScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
