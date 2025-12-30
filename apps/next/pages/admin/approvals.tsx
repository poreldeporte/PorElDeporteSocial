import { MemberApprovalsScreen } from 'app/features/admin/member-approvals-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'

import { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('adminApprovals')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <MemberApprovalsScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id}>
    {page}
  </HomeLayout>
)

export default Page
