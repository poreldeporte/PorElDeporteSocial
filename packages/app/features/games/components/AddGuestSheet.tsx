import { useEffect, useState } from 'react'
import { Keyboard, TouchableWithoutFeedback } from 'react-native'
import { Star } from '@tamagui/lucide-icons'

import {
  Button,
  Input,
  Paragraph,
  Separator,
  Sheet,
  SizableText,
  Spinner,
  Text,
  TextArea,
  XStack,
  YStack,
  submitButtonBaseProps,
  useToastController,
} from '@my/ui/public'
import { UsPhoneMaskInput } from 'app/components/UsPhoneMaskInput'
import { BRAND_COLORS } from 'app/constants/colors'
import { api } from 'app/utils/api'
import { parsePhoneToE164 } from 'app/utils/phone'

import { ctaButtonStyles } from '../cta-styles'

const STAR_VALUES = [1, 2, 3, 4, 5]

type AddGuestSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
}

export const AddGuestSheet = ({ open, onOpenChange, gameId }: AddGuestSheetProps) => {
  const toast = useToastController()
  const utils = api.useUtils()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(0)

  const mutation = api.queue.addGuest.useMutation({
    onSuccess: async ({ status }) => {
      await Promise.all([utils.games.list.invalidate(), utils.games.byId.invalidate({ id: gameId })])
      toast.show(status === 'rostered' ? 'Guest added to roster' : 'Guest added to waitlist')
      onOpenChange(false)
    },
    onError: (error) => {
      toast.show('Unable to add guest', { message: error.message })
    },
  })

  useEffect(() => {
    if (!open) return
    setFirstName('')
    setLastName('')
    setPhone('')
    setNotes('')
    setRating(0)
  }, [open])

  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  const trimmedPhone = phone.trim()
  const trimmedNotes = notes.trim()
  const canSubmit =
    trimmedFirstName.length > 0 &&
    trimmedLastName.length > 0 &&
    trimmedPhone.length > 0 &&
    rating > 0 &&
    !mutation.isPending
  const submitButtonStyle = canSubmit ? ctaButtonStyles.brandSolid : ctaButtonStyles.neutralSolid

  const handleSubmit = () => {
    if (!canSubmit) return
    const normalizedPhone = parsePhoneToE164(trimmedPhone, 'US')
    if (!normalizedPhone) {
      toast.show('Enter a valid phone number.')
      return
    }
    Keyboard.dismiss()
    mutation.mutate({
      gameId,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      phone: normalizedPhone,
      notes: trimmedNotes || null,
      rating,
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      snapPoints={[75]}
      snapPointsMode="percent"
      dismissOnSnapToBottom
      dismissOnOverlayPress
      animationConfig={{ type: 'spring', damping: 20, mass: 1.2, stiffness: 250 }}
    >
      <Sheet.Overlay
        opacity={0.5}
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        zIndex={0}
      />
      <Sheet.Frame backgroundColor="$background" borderColor="$black1" borderWidth={1}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <YStack flex={1}>
            <YStack px="$4" pt="$4" pb="$3" gap="$2.5">
              <XStack ai="center" jc="space-between" gap="$2">
                <YStack gap="$0.5" flex={1} minWidth={0}>
                  <SizableText size="$6" fontWeight="700">
                    Add guest
                  </SizableText>
                  <Paragraph theme="alt2" size="$2">
                    Add a one-time guest to this game.
                  </Paragraph>
                </YStack>
                <Button chromeless size="$2" onPress={() => onOpenChange(false)}>
                  Close
                </Button>
              </XStack>
              <Paragraph theme="alt2" size="$2">
                Max 4 guests per member per game.
              </Paragraph>
              <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
            </YStack>
            <Separator />
            <YStack px="$4" py="$3" gap="$3">
              <YStack gap="$2">
                <Paragraph fontWeight="600">Rating</Paragraph>
                <XStack gap="$1" ai="center">
                  {STAR_VALUES.map((value) => {
                    const active = value <= rating
                    return (
                      <Button
                        key={value}
                        chromeless
                        p="$1"
                        onPress={() => setRating(value)}
                        aria-label={`Rate ${value} stars`}
                        pressStyle={{ opacity: 0.7 }}
                      >
                        <Star
                          size={24}
                          color={active ? BRAND_COLORS.primary : '$color8'}
                          fill={active ? BRAND_COLORS.primary : 'transparent'}
                        />
                      </Button>
                    )
                  })}
                </XStack>
              </YStack>
              <XStack gap="$3">
                <YStack gap="$1" flex={1} minWidth={0}>
                  <Paragraph fontWeight="600">First name</Paragraph>
                  <Input
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor="$color10"
                    autoCapitalize="words"
                    borderRadius={12}
                    borderColor="$borderColor"
                    backgroundColor="$color1"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </YStack>
                <YStack gap="$1" flex={1} minWidth={0}>
                  <Paragraph fontWeight="600">Last name</Paragraph>
                  <Input
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    placeholderTextColor="$color10"
                    autoCapitalize="words"
                    borderRadius={12}
                    borderColor="$borderColor"
                    backgroundColor="$color1"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </YStack>
              </XStack>
              <YStack gap="$1">
                <Paragraph fontWeight="600">Phone number</Paragraph>
                <XStack
                  ai="center"
                  gap="$2"
                  borderRadius={12}
                  borderColor="$borderColor"
                  borderWidth={1}
                  backgroundColor="$color1"
                  px="$3"
                  py="$2"
                >
                  <Text fontSize={16} fontWeight="700">
                    +1
                  </Text>
                  <UsPhoneMaskInput
                    value={phone}
                    onChange={setPhone}
                    textProps={{ fontSize: 16, color: '$color' }}
                    inputProps={{
                      selectionColor: BRAND_COLORS.primary,
                      caretColor: BRAND_COLORS.primary,
                    }}
                  />
                </XStack>
              </YStack>
              <YStack gap="$1">
                <Paragraph fontWeight="600">Style of play (optional)</Paragraph>
                <TextArea
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Quick notes for the draft"
                  placeholderTextColor="$color10"
                  borderRadius={12}
                  borderColor="$borderColor"
                  backgroundColor="$color1"
                  minHeight={100}
                  maxLength={280}
                />
              </YStack>
              <Button
                {...submitButtonBaseProps}
                disabled={!canSubmit}
                onPress={handleSubmit}
                iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
                {...submitButtonStyle}
              >
                {mutation.isPending ? 'Adding…' : 'Add guest'}
              </Button>
            </YStack>
          </YStack>
        </TouchableWithoutFeedback>
      </Sheet.Frame>
    </Sheet>
  )
}
