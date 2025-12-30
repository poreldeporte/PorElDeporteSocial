import { HomeLayout } from 'app/features/home/layout.web'
import { PendingReviewScreen } from 'app/features/auth/pending-review-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('profileReview')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <PendingReviewScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
