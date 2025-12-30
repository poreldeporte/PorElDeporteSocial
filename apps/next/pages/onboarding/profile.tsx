import { HomeLayout } from 'app/features/home/layout.web'
import { ProfileOnboardingScreen } from 'app/features/profile/profile-onboarding-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('profileOnboarding')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <ProfileOnboardingScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
