import {
  Banner,
  Button,
  Dialog,
  EventCard,
  FullscreenSpinner,
  H4,
  Paragraph,
  ScrollView,
  Text,
  Theme,
  TodoCard,
  View,
  XStack,
  YStack,
  isWeb,
} from '@my/ui'
import { Calendar, X } from '@tamagui/lucide-icons'
import ScrollToTopTabBarContainer from 'app/utils/NativeScreenContainer'
import useEventsQuery from 'app/utils/react-query/useEventQuery'
import { useUser } from 'app/utils/useUser'
import { useState } from 'react'

import { AchievementsSection } from './components/achievements-section'
import { Greetings } from './components/greetings'
import { OverviewSection } from './components/overview-section'
import { PostsSection } from './components/posts-section'

export function HomeScreen() {
  const { user, isPending } = useUser()

  if (isPending)
    return (
      <View flex={1} height={'80vh' as any} ai="center" jc="center">
        <FullscreenSpinner />
      </View>
    )

  if (!user) return null

  return (
    <XStack maw={1480} als="center" f={1}>
      <ScrollView f={4} fb={0}>
        <ScrollToTopTabBarContainer>
          <XStack ai="center" jc="space-between">
            <Greetings />
            {isWeb && <EventDrawer />}
          </XStack>
          <YStack gap="$7" pb="$10">
            <AchievementsSection />
            <OverviewSection />
            <PostsSection />
          </YStack>
        </ScrollToTopTabBarContainer>
      </ScrollView>

      {isWeb && (
        <View $lg={{ dsp: 'none' }}>
          <EventCards />
        </View>
      )}
    </XStack>
  )
}

const EventDrawer = () => {
  return (
    <View $gtLg={{ dsp: 'none' }}>
      <Dialog modal>
        <Dialog.Trigger asChild>
          <Button size="$3" mx="$5" icon={Calendar}>
            Events
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="slow"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />

          <Dialog.Content
            elevate
            alignSelf="flex-end"
            h="100%"
            key="content"
            animateOnly={['transform', 'opacity']}
            animation={[
              'lazy',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 1000 }}
            exitStyle={{ x: 1000 }}
            gap="$2"
            p="$0"
            bg="$gray1"
          >
            <XStack pt="$4" px="$4" jc="space-between" ai="center">
              <XStack gap="$2" ai="center" jc="center">
                <Calendar size="$1" />
                <Text fontWeight="bold">Events</Text>
              </XStack>
              <Dialog.Close asChild>
                <Button size="$2" circular icon={X} />
              </Dialog.Close>
            </XStack>
            <EventCards />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  )
}

const EventCards = () => {
  const { data = [], isPending } = useEventsQuery()

  if (isPending) return null

  return (
    <ScrollView maxWidth={350}>
      <YStack p="$3" gap="$3">
        {data?.length ? (
          data?.map((event) => (
            <EventCard
              br="$4"
              bw={1.5}
              borderColor="$borderColor"
              key={event.id}
              title={event.name}
              description={event.description}
              action={{
                text: 'Show Event',
                props: {
                  href: `/event/${event.id}`,
                  accessibilityRole: 'link',
                  onPress: () => undefined,
                },
              }}
              tags={[
                { text: event.status, theme: 'green_alt2' },
                {
                  text: `${new Date(event.end_time).toLocaleDateString()} Remaining`,
                  theme: 'blue_alt2',
                },
              ]}
            />
          ))
        ) : (
          <View h={400} miw="100%" ai="center" jc="center" f={1} background="$gray1">
            <Text>No events yet?</Text>
          </View>
        )}

        <Theme name="blue_alt1">
          <Banner cur="pointer">
            <H4>Upgrade Now!</H4>
            <Paragraph size="$2" mt="$1">
              Upgrade to access exclusive features and more!
            </Paragraph>
          </Banner>
        </Theme>

        <TodoList />
      </YStack>
    </ScrollView>
  )
}

const TodoList = () => {
  const [data, setData] = useState(todoData)

  return (
    <YStack borderRadius="$4" overflow="hidden">
      {data.map((todo, index) => (
        <TodoCard
          onCheckedChange={(checked) => {
            setData((prev) => prev.map((t, i) => (i === index ? { ...t, checked: !!checked } : t)))
          }}
          key={index}
          label={todo.label}
          checked={todo.checked}
        />
      ))}
    </YStack>
  )
}

const todoData = [
  { label: 'Contribute to OSS', checked: false },
  { label: 'Contribute to OSS', checked: true },
  { label: 'Upgrade to the new Expo version', checked: false },
  { label: 'Do the dishes', checked: false },
]
