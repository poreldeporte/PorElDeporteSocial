import { HomeLayout } from 'app/features/home/layout.web'
import { ChangePasswordScreen } from 'app/features/settings/change-password-screen'
import { SettingsLayout } from 'app/features/settings/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import Head from 'next/head'
import type { NextPageWithLayout } from 'pages/_app'

const layout = getScreenLayout('settingsChangePassword')

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <ChangePasswordScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id}>
    <SettingsLayout>{page}</SettingsLayout>
  </HomeLayout>
)

export default Page
