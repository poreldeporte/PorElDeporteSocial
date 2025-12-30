import { HomeLayout } from 'app/features/home/layout.web'
import { AdminProfileEditScreen } from 'app/features/profile/edit-screen'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'
import { useRouter } from 'next/router'

import type { NextPageWithLayout } from '../../_app'

const layout = getScreenLayout('adminMemberEdit')

const Page: NextPageWithLayout = () => {
  const { query } = useRouter()
  const id = Array.isArray(query.id) ? query.id[0] : query.id

  if (!id) return null

  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <AdminProfileEditScreen profileId={id} />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout layoutId={layout.id} backHref="/admin/approvals">
    {page}
  </HomeLayout>
)

export default Page
