import { useEffect, useState } from 'react'
import { Keyboard, TouchableWithoutFeedback } from 'react-native'
import { Star, X } from '@tamagui/lucide-icons'

import {
  Button,
  FieldError,
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
import { api } from 'app/utils/api'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { parsePhoneToE164 } from 'app/utils/phone'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useBrand } from 'app/provider/brand'

import { useCtaButtonStyles } from '../cta-styles'

const STAR_VALUES = [1, 2, 3, 4, 5]

type AddGuestSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
}

export const AddGuestSheet = ({ open, onOpenChange, gameId }: AddGuestSheetProps) => {
  const { primaryColor } = useBrand()
  const ctaButtonStyles = useCtaButtonStyles()
  const toast = useToastController()
  const utils = api.useUtils()
  const { activeCommunityId } = useActiveCommunity()
  const insets = useSafeAreaInsets()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    phone: false,
    rating: false,
  })
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const invalidateLists = async () => {
    if (!activeCommunityId) return
    await Promise.all([
      utils.games.list.invalidate({ scope: 'upcoming', communityId: activeCommunityId }),
      utils.games.list.invalidate({ scope: 'past', communityId: activeCommunityId }),
    ])
  }

  const mutation = api.queue.addGuest.useMutation({
    onSuccess: async ({ status }) => {
      await Promise.all([invalidateLists(), utils.games.byId.invalidate({ id: gameId })])
      toast.show(status === 'rostered' ? 'Guest added to roster' : 'Guest added to waitlist')
      setFirstName('')
      setLastName('')
      setPhone('')
      setNotes('')
      setRating(0)
      setTouched({
        firstName: false,
        lastName: false,
        phone: false,
        rating: false,
      })
      setSubmitAttempted(false)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.show('Unable to add guest', { message: error.message })
    },
  })

  useEffect(() => {
    setFirstName('')
    setLastName('')
    setPhone('')
    setNotes('')
    setRating(0)
    setTouched({
      firstName: false,
      lastName: false,
      phone: false,
      rating: false,
    })
    setSubmitAttempted(false)
  }, [gameId])

  useEffect(() => {
    if (!open) return
    setSubmitAttempted(false)
    setTouched({
      firstName: false,
      lastName: false,
      phone: false,
      rating: false,
    })
  }, [open])

  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  const trimmedPhone = phone.trim()
  const trimmedNotes = notes.trim()
  const normalizedPhone = trimmedPhone.length > 0 ? parsePhoneToE164(trimmedPhone, 'US') : null
  const showFirstNameError = submitAttempted || touched.firstName
  const showLastNameError = submitAttempted || touched.lastName
  const showPhoneError = submitAttempted || touched.phone
  const showRatingError = submitAttempted || touched.rating
  const firstNameError = showFirstNameError && !trimmedFirstName ? 'First name is required.' : undefined
  const lastNameError = showLastNameError && !trimmedLastName ? 'Last name is required.' : undefined
  const phoneError = showPhoneError
    ? !trimmedPhone
      ? 'Phone number is required.'
      : normalizedPhone
        ? undefined
        : 'Enter a valid phone number.'
    : undefined
  const ratingError = showRatingError && rating === 0 ? 'Select a rating.' : undefined
  const isValid =
    trimmedFirstName.length > 0 &&
    trimmedLastName.length > 0 &&
    Boolean(normalizedPhone) &&
    rating > 0
  const submitButtonStyle = isValid ? ctaButtonStyles.brandSolid : ctaButtonStyles.neutralSolid

  const handleSubmit = () => {
    if (mutation.isPending) return
    setSubmitAttempted(true)
    if (!trimmedFirstName || !trimmedLastName || !normalizedPhone || rating === 0) {
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
      <Sheet.Frame backgroundColor="$background" borderColor="$color12" borderWidth={1}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <YStack flex={1}>
            <YStack px="$4" pt="$4" pb="$3" gap="$2.5">
              <XStack ai="center" jc="space-between" gap="$2">
                <YStack gap="$0.5" flex={1} minWidth={0}>
                  <SizableText size="$6" fontWeight="700">
                    Add guest
                  </SizableText>
                  <Paragraph theme="alt2" size="$2">
                    Add a one-time guest to this game. Max 4 guests per member per game.
                  </Paragraph>
                </YStack>
                <Button
                  chromeless
                  size="$2"
                  icon={X}
                  onPress={() => onOpenChange(false)}
                  aria-label="Close"
                  pressStyle={{ opacity: 0.7 }}
                />
              </XStack>
              <YStack h={2} w={56} br={999} bg={primaryColor} />
            </YStack>
            <Separator />
            <Sheet.ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
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
                          onPress={() => {
                            setRating(value)
                            setTouched((prev) => ({ ...prev, rating: true }))
                          }}
                          aria-label={`Rate ${value} stars`}
                          pressStyle={{ opacity: 0.7 }}
                        >
                          <Star
                            size={24}
                            color={active ? primaryColor : '$color8'}
                            fill={active ? primaryColor : 'transparent'}
                          />
                        </Button>
                      )
                    })}
                  </XStack>
                  <FieldError message={ratingError} />
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
                      borderColor={firstNameError ? '$red10' : '$borderColor'}
                      backgroundColor="$color1"
                      returnKeyType="done"
                      onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <FieldError message={firstNameError} />
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
                      borderColor={lastNameError ? '$red10' : '$borderColor'}
                      backgroundColor="$color1"
                      returnKeyType="done"
                      onBlur={() => setTouched((prev) => ({ ...prev, lastName: true }))}
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <FieldError message={lastNameError} />
                  </YStack>
                </XStack>
                <YStack gap="$1">
                  <Paragraph fontWeight="600">Phone number</Paragraph>
                  <XStack
                    ai="center"
                    gap="$2"
                    borderRadius={12}
                    borderColor={phoneError ? '$red10' : '$borderColor'}
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
                      onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                      textProps={{ fontSize: 16, color: '$color' }}
                      inputProps={{
                        selectionColor: primaryColor,
                        caretColor: primaryColor,
                      }}
                    />
                  </XStack>
                  <FieldError message={phoneError} />
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
                  disabled={mutation.isPending}
                  onPress={handleSubmit}
                  iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
                  {...submitButtonStyle}
                >
                  {mutation.isPending ? 'Adding…' : 'Add guest'}
                </Button>
              </YStack>
            </Sheet.ScrollView>
          </YStack>
        </TouchableWithoutFeedback>
      </Sheet.Frame>
    </Sheet>
  )
}
