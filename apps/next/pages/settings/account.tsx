import { AccountSettingsScreen } from 'app/features/settings/account-screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { SettingsLayout } from 'app/features/settings/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'
import { NextPageWithLayout } from 'pages/_app'

const layout = getScreenLayout('settingsAccount')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <AccountSettingsScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id}>
    <SettingsLayout>{page}</SettingsLayout>
  </HomeLayout>
)

export default Page
