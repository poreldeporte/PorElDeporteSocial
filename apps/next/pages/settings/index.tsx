import { HomeLayout } from 'app/features/home/layout.web'
import { GeneralSettingsScreen } from 'app/features/settings/general-screen'
import { SettingsLayout } from 'app/features/settings/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'
import { NextPageWithLayout } from 'pages/_app'

const layout = getScreenLayout('settings')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <GeneralSettingsScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id}>
    <SettingsLayout isSettingsHome>{page}</SettingsLayout>
  </HomeLayout>
)

export default Page
