import {
  Ban,
  BellRing,
  Carrot,
  CircleUser,
  Flag,
  Image,
  MoreHorizontal,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Trash,
  User,
  Video,
} from '@tamagui/lucide-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated'
import {
  Avatar,
  Button,
  Circle,
  Form,
  Group,
  Input,
  isWeb,
  ScrollView,
  styled,
  Text,
  Theme,
  useThemeName,
  View,
  XStack,
  type ThemeName,
} from 'tamagui'
import { Chip } from '../chips/components/chipsParts'
import { BubbleChat, type MessageItem } from './components/Chat/BubbleChat'
import { ChatContext } from './components/Chat/ChatContext'
import { ThemePicker } from './components/Chat/ThemePicker'

const AnimatedView = Animated.createAnimatedComponent(View)
const { height: mobileHeight } = Dimensions.get('window')

const height = isWeb ? 700 : mobileHeight

const AVATAR_1_URL = 'https://tamagui.dev/bento/images/wheel-list/wl_6.png'

const SPRING_CONFIG = {
  damping: 18,
  mass: 0.5,
  stiffness: 180,
}

const Label = styled(Text, {
  fontWeight: '500',
  fontFamily: '$silkscreen',
  textTransform: 'uppercase',
  fontSize: '$2',
  color: '$color10',
})

export const Chat = () => {
  const offset = useSharedValue(0)
  const [list, setList] = useState<MessageItem[]>(data)
  const themeName = useThemeName()
  const [theme, setTheme] = useState<ThemeName>()
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    const listener = Keyboard.addListener('keyboardWillShow', () => {
      offset.value = 0
    })
    return () => listener.remove()
  }, [])

  const animatedListViewStyle = useAnimatedStyle(() => {
    const hide = offset.value > height / 2
    return {
      opacity: withSpring(hide ? 0 : 1, SPRING_CONFIG),
      transform: [{ translateY: withSpring(hide ? 30 : 0, SPRING_CONFIG) }],
      flex: 1,
    }
  })

  const onSend = (message: string) => {
    setList((prev) => [{ id: `${Date.now()}`, createdAt: Date.now(), message }, ...prev])

    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: 0, animated: true })
    }, 100)
  }

  return (
    <ChatContext.Provider value={{ theme, setTheme }}>
      <View theme={theme} h="100%" flex={1}>
        <View bg={themeName.includes('dark') ? 'white' : 'black'} themeInverse flex={1} position="absolute" inset={0} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <Header offset={offset} />

          <GestureView offset={offset} />

          <AnimatedView
            bg="$background"
            overflow="hidden"
            borderTopLeftRadius="$8"
            borderTopRightRadius="$8"
            flex={1}
            borderCurve="circular"
          >
            <AnimatedView style={animatedListViewStyle}>
              <FlatList
                ref={listRef}
                inverted
                keyboardDismissMode="interactive"
                contentContainerStyle={{ padding: 24, gap: 16 }}
                showsVerticalScrollIndicator={false}
                data={list}
                scrollEventThrottle={16}
                renderItem={({ item }) => <BubbleChat item={item} />}
              />
            </AnimatedView>

            <BottomBar onSend={onSend} offset={offset} />
          </AnimatedView>
        </KeyboardAvoidingView>
      </View>
    </ChatContext.Provider>
  )
}

const BottomBar = ({
  onSend,
  offset,
}: { onSend: (message: string) => void; offset: SharedValue<number> }) => {
  const theme = useThemeName()

  const { handleSubmit, control } = useForm({
    defaultValues: {
      message: '',
    },
  })

  const onSubmit = (data: { message: string }) => {
    onSend(data.message)
  }

  return (
    <View>
      <Form>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, value } }) => {
            const submit = () => {
              handleSubmit(onSubmit)()
              onChange('')
            }

            return (
              <XStack alignItems="center" gap="$3" px="$4" py="$4">
                <Button size="$3" circular>
                  <Plus />
                </Button>
                <Input
                  borderRadius="$10"
                  placeholder="Typing..."
                  flex={1}
                  onSubmitEditing={submit}
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => (offset.value = 0)}
                />
                {value.trim().length > 0 ? (
                  <Theme name={theme.includes('accent') ? 'blue' : theme}>
                    <Button
                      animation="200ms"
                      enterStyle={{ scale: 0.2 }}
                      exitStyle={{ scale: 0.2 }}
                      scale={1}
                      size="$3"
                      onPress={submit}
                      circular
                    >
                      <Send />
                    </Button>
                  </Theme>
                ) : (
                  <Button
                    animation="200ms"
                    enterStyle={{ scale: 0.2 }}
                    exitStyle={{ scale: 0.2 }}
                    scale={1}
                    size="$3"
                    circular
                  >
                    <Smile />
                  </Button>
                )}
              </XStack>
            )
          }}
        />
      </Form>

      <SafeAreaView />
    </View>
  )
}

const Header = ({ offset }: { offset: SharedValue<number> }) => {
  const style = useAnimatedStyle(() => ({
    height: withSpring(offset.value > 0 ? offset.value : 16, SPRING_CONFIG),
  }))

  const profileStyle = useAnimatedStyle(() => ({
    opacity: withSpring(offset.value > height / 2 ? 0 : 1, SPRING_CONFIG),
    transform: [
      {
        translateY: withSpring(
          interpolate(
            offset.value,
            [0, height],
            [0, -HEADER_HEIGHT * 2],
            Extrapolation.CLAMP
          ),
          SPRING_CONFIG
        ),
      },
    ],
  }))

  return (
    <AnimatedView
      overflow="hidden"
      borderBottomLeftRadius="$8"
      borderBottomRightRadius="$8"
      borderCurve="circular"
      bg="$background"
      justifyContent="center"
    >
      <SafeAreaView />

      <AnimatedView style={profileStyle}>
        <XStack px="$4" alignItems="center" pt="$4" gap="$3">
          <Avatar circular size={AVATAR_SIZE} bg="red">
            <Avatar.Image source={{ uri: AVATAR_1_URL }} objectFit="cover" />
            <Avatar.Fallback />
          </Avatar>
          <View gap="$1" flex={1}>
            <Text fontSize="$4" fontWeight="bold">
              Jony Ive
            </Text>
            <Text theme="green" fontSize="$3" color="$color10">
              online
            </Text>
          </View>

          <View>
            <Button size="$3" circular>
              <PhoneCall size={'$1'} />
            </Button>
            <Circle
              zIndex={1}
              position="absolute"
              h={10}
              w={10}
              top={0}
              right={0}
              bg="green"
            />
          </View>
        </XStack>
      </AnimatedView>
      <AnimatedView style={style}>
        <MenuView offset={offset} />
      </AnimatedView>
    </AnimatedView>
  )
}

const MenuView = ({ offset }: { offset: SharedValue<number> }) => {
  const style = useAnimatedStyle(() => {
    const hide = offset.value < height / 2
    return {
      flex: 1,
      opacity: withSpring(hide ? 0 : 1, SPRING_CONFIG),
      transform: [{ translateY: withSpring(hide ? 100 : 0, SPRING_CONFIG) }],
    }
  })

  return (
    <AnimatedView style={style}>
      <ScrollView
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ py: '$6' }}
        showsVerticalScrollIndicator={false}
      >
        <View gap="$6">
          <View gap="$3" alignItems="center">
            <View
              theme="green"
              alignSelf="center"
              p="$1"
              borderColor="$color10"
              borderWidth={2}
              borderRadius="$20"
            >
              <Avatar circular size="$8" bg="red">
                <Avatar.Image source={{ uri: AVATAR_1_URL }} objectFit="cover" />
                <Avatar.Fallback />
              </Avatar>
              <Circle
                position="absolute"
                bg="$color10"
                h={16}
                w={16}
                right={4}
                bottom={4}
                borderWidth={2}
                borderColor="$background"
                zIndex={1}
              />
            </View>
            <View gap="$2" alignItems="center">
              <Text textAlign="center" fontSize="$8" fontWeight="bold">
                Jony Ive
              </Text>
              <Chip rounded theme="accent" size="$2">
                <Chip.Text fontFamily="$silkscreen">@jony_ive</Chip.Text>
              </Chip>
            </View>
          </View>

          <ButtonGroup />

          <OptionsMenuGroup />

          <View gap="$2">
            <Label px="$4">Appearance</Label>
            <ThemePicker />
          </View>

          <SettingMenuGroup />
        </View>
      </ScrollView>
    </AnimatedView>
  )
}

const OptionsMenuGroup = () => {
  return (
    <View px="$4" gap="$3">
      <Label>Options</Label>
      <Group borderRadius="$6" borderCurve="circular">
        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <Search />
            </Button.Icon>
            <Button.Text>Search Messages</Button.Text>
          </Button>
        </Group.Item>

        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <Image />
            </Button.Icon>
            <Button.Text>Media</Button.Text>
          </Button>
        </Group.Item>

        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <CircleUser />
            </Button.Icon>
            <Button.Text>Nickname</Button.Text>
          </Button>
        </Group.Item>

        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <Carrot />
            </Button.Icon>
            <Button.Text>Icon</Button.Text>
          </Button>
        </Group.Item>
      </Group>
    </View>
  )
}

const SettingMenuGroup = () => {
  return (
    <View px="$4" gap="$3">
      <Label>Settings</Label>
      <Group borderRadius="$6" borderCurve="circular">
        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <ShieldCheck />
            </Button.Icon>
            <Button.Text>end-to-end encryption</Button.Text>
          </Button>
        </Group.Item>

        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <Flag />
            </Button.Icon>
            <Button.Text>Report</Button.Text>
          </Button>
        </Group.Item>

        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <Ban />
            </Button.Icon>
            <Button.Text>Block User</Button.Text>
          </Button>
        </Group.Item>

        <Group.Item>
          <Button justifyContent="flex-start">
            <Button.Icon scaleIcon={1.5}>
              <Trash color="red" />
            </Button.Icon>
            <Button.Text color="red">Delete Chat</Button.Text>
          </Button>
        </Group.Item>
      </Group>
    </View>
  )
}

const ButtonGroup = () => {
  return (
    <XStack alignItems="center" gap="$4" justifyContent="center">
      <Theme name="green">
        <Button aspectRatio={1} circular>
          <Phone />
        </Button>
      </Theme>

      <Theme name="blue">
        <Button aspectRatio={1} circular>
          <Video />
        </Button>
      </Theme>

      <Button aspectRatio={1} circular>
        <BellRing />
      </Button>

      <Button aspectRatio={1} circular>
        <User />
      </Button>

      <Button aspectRatio={1} circular>
        <MoreHorizontal />
      </Button>
    </XStack>
  )
}

const AVATAR_SIZE = 48
const SPACE = 16
const HEADER_HEIGHT = 48 + SPACE * 2

Chat.displayName = 'Chat'
Chat.fileName = 'Chat'

const GestureView = ({ offset }: { offset: SharedValue<number> }) => {
  const isDragging = useRef(false)
  const startY = useRef(0)

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss()
  }, [])

  // Native
  const gesture = Gesture.Pan()
    .onChange(({ absoluteY }) => {
      offset.value = absoluteY - HEADER_HEIGHT
    })
    .onEnd(({ velocityY }) => {
      if ((offset.value / height) * 100 > 50 || velocityY > height) {
        // 70% of the height
        offset.value = (height * 70) / 100
      } else {
        offset.value = 0
      }
      runOnJS(dismissKeyboard)()
    })

  // Web
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaY = e.clientY - startY.current
    offset.value = deltaY
  }

  const handleMouseUp = () => {
    if (!isDragging.current) return
    isDragging.current = false

    if (offset.value > height / 2) {
      offset.value = (height * 70) / 100
    } else {
      offset.value = 0
    }
  }

  useEffect(() => {
    if (isWeb) {
      document.addEventListener('mousemove', handleMouseMove as any)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [])

  const Handler = () => (
    <View>
      <View alignSelf="center" m="$2" h={6} w="$4" borderRadius="$4" bg="$background" />
    </View>
  )

  return isWeb ? (
    <View onMouseDown={handleMouseDown} style={{ cursor: 'grab' }}>
      {Handler()}
    </View>
  ) : (
    <GestureDetector gesture={gesture}>{Handler()}</GestureDetector>
  )
}

// user mock
const user = {
  id: '1',
  name: 'Jony Ive',
  avatar: AVATAR_1_URL,
}

const data: MessageItem[] = [
  {
    id: '11',
    createdAt: 1714210800,
    message: 'Perfect! Looking forward to it. 👍',
    user,
  },
  {
    id: '10',
    createdAt: 1714210200,
    message: "Sounds like a plan. Let's discuss it more in our next team meeting.",
  },
  {
    id: '9',
    createdAt: 1714209600,
    message: 'Absolutely! I think it would really speed up our development process.',
    user,
  },
  {
    id: '8',
    createdAt: 1714209000,
    message: "That's always helpful. Maybe we can use it in our next project?",
  },
  {
    id: '7',
    createdAt: 1714208400,
    message:
      'Pretty smooth actually. The docs are well-written and there are good examples.',
    user,
  },
  {
    id: '6',
    createdAt: 1714207800,
    message: "Nice! I'll definitely check it out. How's the learning curve?",
  },
  {
    id: '5',
    createdAt: 1714207200,
    message: 'Yeah, the new Accordion and Popover components look really useful!',
    user,
  },
  {
    id: '4',
    createdAt: 1714206600,
    message: "That sounds great! Any specific components you're excited about?",
  },
  {
    id: '3',
    createdAt: 1714206000,
    message: "They've added some cool new components and improved performance.",
    user,
  },
  {
    id: '2',
    createdAt: 1714205400,
    message: "Not yet! What's new in it?",
  },
  {
    id: '1',
    createdAt: 1714204800,
    message: 'Hey, have you seen the new Tamagui update?',
    user,
  },
]
