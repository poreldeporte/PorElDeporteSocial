import Head from 'next/head'
import { Link } from 'solito/link'

import { Button } from '@my/ui/public'
import { Settings } from '@tamagui/lucide-icons'
import { ProfileScreen } from 'app/features/profile/screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'
import { useUser } from 'app/utils/useUser'

import type { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('profile')

const CommunitySettingsButton = () => {
  const { isAdmin } = useUser()
  if (!isAdmin) return null
  return (
    <Link href="/settings/community">
      <Button
        chromeless
        px={0}
        py={0}
        height="$4"
        width="$4"
        aria-label="Community settings"
        pressStyle={{ opacity: 0.7 }}
      >
        <Settings size={22} />
      </Button>
    </Link>
  )
}

const Page: NextPageWithLayout = () => {
  return (
    <>
      <Head>
        <title>{layout.title}</title>
      </Head>
      <ProfileScreen />
    </>
  )
}

Page.getLayout = (page) => (
  <HomeLayout fullPage layoutId={layout.id} headerRight={<CommunitySettingsButton />}>
    {page}
  </HomeLayout>
)

export default Page
