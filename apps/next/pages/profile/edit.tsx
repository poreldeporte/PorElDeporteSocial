import { HomeLayout } from 'app/features/home/layout.web'
import { EditProfileScreen } from 'app/features/profile/edit-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('profileEdit')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <EditProfileScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
