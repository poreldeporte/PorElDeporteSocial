import { Paragraph, YStack, Button } from '@my/ui'
import { useEffect } from 'react'
import { Link } from 'solito/link'

import { SHOP_URL } from './constants'

export const ShopScreen = () => (
  <RedirectNotice />
)

const RedirectNotice = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.assign(SHOP_URL)
    }
  }, [])
  return (
    <YStack f={1} bg="$color1" ai="center" jc="center" gap="$3" p="$4">
      <Paragraph theme="alt2" textAlign="center">
        Redirecting you to our Shopify store…
      </Paragraph>
      <Link href={SHOP_URL} target="_blank" rel="noreferrer">
        <Button br="$9" theme="alt1">
          Open shop
        </Button>
      </Link>
    </YStack>
  )
}
