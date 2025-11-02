import { HomeLayout } from 'app/features/home/layout.web'
import { EditProfileScreen } from 'app/features/profile/edit-screen'
import Head from 'next/head'

import { NextPageWithLayout } from '../_app'

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>Edit Profile</title>
      </Head>
      <EditProfileScreen />
    </>
  )
}

Page.getLayout = (page) => <HomeLayout>{page}</HomeLayout>

export default Page
