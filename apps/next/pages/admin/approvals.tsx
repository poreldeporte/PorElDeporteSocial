import Head from 'next/head'

import { MemberListScreen } from 'app/features/admin/member-list-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'

import { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('adminApprovals')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <MemberListScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
