import { useRouter } from 'next/router'

export const useCommunityLink = () => {
  const router = useRouter()
  const communityId = typeof router.query.communityId === 'string' ? router.query.communityId : null
  const url = typeof router.asPath === 'string' ? router.asPath : '/'
  const pathname = router.pathname
  return { communityId, url, pathname }
}
