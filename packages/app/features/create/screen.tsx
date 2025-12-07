import { Paragraph, ScrollView, YStack } from '@my/ui/public'
import { usePathname } from 'app/utils/usePathname'
import { useUser } from 'app/utils/useUser'
import { useRouter } from 'solito/router'

import { CreateGameForm } from './CreateGameForm'

export const CreateScreen = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { role } = useUser()
  const isAdmin = role === 'admin'

  const handleSuccess = () => {
    if (pathname === '/create') {
      router.replace('/games')
    } else {
      router.back()
    }
  }

  if (!isAdmin) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack w="100%" maxWidth={660} mx="auto" gap="$4" px="$4" py="$6">
          <Paragraph theme="alt1">
            Only admins can schedule games. Reach out to a community organizer if you need access.
          </Paragraph>
        </YStack>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <YStack
        w="100%"
        maxWidth={660}
        mx="auto"
        gap="$4"
        px="$4"
        py="$6"
        $gtSm={{ mt: '$6' }}
      >
        <YStack gap="$2">
          <Paragraph theme="alt1">
            Game details sync instantly with the home feed, so members can claim spots right away.
          </Paragraph>
        </YStack>
        <CreateGameForm onSuccess={handleSuccess} />
      </YStack>
    </ScrollView>
  )
}
