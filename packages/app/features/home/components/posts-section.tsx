import {
  Button,
  FeedCard,
  FullscreenSpinner,
  H4,
  Stack,
  Text,
  Theme,
  View,
  XStack,
  isWeb,
  useToastController,
  validToken,
} from '@my/ui/public'
import { ArrowRight } from '@tamagui/lucide-icons'
import usePostQuery from 'app/utils/react-query/usePostQuery'
import { useEffect } from 'react'
import { Platform } from 'react-native'

const feedCardWidthMd = validToken(
  Platform.select({
    web: 'calc(33.33% - 12px)',
    native: '32%',
  })
)

export const PostsSection = () => {
  const { data, isPending, isError } = usePostQuery()

  const toast = useToastController()

  useEffect(() => {
    isError && toast.show('Error loading posts.')
  }, [data, isPending, isError])

  if (isPending) return <FullscreenSpinner />

  return (
    <View>
      <XStack
        paddingHorizontal="$4.5"
        alignItems="center"
        gap="$2"
        justifyContent="space-between"
        marginBottom="$4"
      >
        <H4 theme="alt1" fontWeight="400">
          Latest Posts
        </H4>
        <Theme name="alt2">
          <Button size="$2" chromeless iconAfter={ArrowRight}>
            View All Posts
          </Button>
        </Theme>
      </XStack>
      <Stack
        maxWidth={1070}
        gap="$3"
        $platform-native={{ marginBottom: '$0', marginLeft: '$1', marginRight: '$2.5' }}
        justifyContent="flex-start"
        flexWrap="wrap"
        flexDirection={isWeb ? 'row' : 'column'}
        $gtMd={{
          gap: '$4',
        }}
      >
        {data?.length ? (
          data.map((card, index) => (
            <FeedCard
              imageUrl={card.image_url}
              key={`${card.title}-${index}`}
              withImages
              marginBottom="$3"
              $gtMd={{ width: feedCardWidthMd, marginBottom: '1%', minWidth: '32.333%' }}
              title={card.title}
              description={`${card?.content?.substring(0, 150)}...`}
              tag={card.tag}
              authors={card.authors}
              $platform-web={{ maxWidth: 300 }}
              $platform-native={{ minWidth: '100%', maxWidth: '100%' }}
            />
          ))
        ) : (
          <View w="100%" px="$4" $gtSm={{ marginBottom: '$4' }}>
            <View
              height={200}
              w="100%"
              alignItems="center"
              justifyContent="center"
              flex={1}
              backgroundColor="$gray1"
              // margin="$2"
              marginLeft="$0"
              borderRadius="$5"
            >
              <Text>No posts created yet</Text>
            </View>
          </View>
        )}
      </Stack>
    </View>
  )
}
