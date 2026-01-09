import Head from 'next/head'
import { Link } from 'solito/link'

import { Button } from '@my/ui/public'
import { PenSquare } from '@tamagui/lucide-icons'
import { ProfileScreen } from 'app/features/profile/screen'
import { HomeLayout } from 'app/features/home/layout.web'
import { getScreenLayout } from 'app/navigation/layouts'

import type { NextPageWithLayout } from '../_app'

const layout = getScreenLayout('profile')

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
  <HomeLayout
    fullPage
    layoutId={layout.id}
    headerRight={
      <Link href="/profile/edit">
        <Button
          chromeless
          px={0}
          py={0}
          height="$4"
          width="$4"
          aria-label="Edit profile"
          pressStyle={{ opacity: 0.7 }}
        >
          <PenSquare size={22} />
        </Button>
      </Link>
    }
  >
    {page}
  </HomeLayout>
)

export default Page
