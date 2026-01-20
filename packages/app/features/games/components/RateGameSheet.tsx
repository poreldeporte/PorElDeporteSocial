import { useEffect, useState } from 'react'
import { Keyboard, TouchableWithoutFeedback } from 'react-native'
import { Star, X } from '@tamagui/lucide-icons'

import {
  Button,
  Paragraph,
  Separator,
  Sheet,
  SizableText,
  Spinner,
  TextArea,
  XStack,
  YStack,
  submitButtonBaseProps,
  useToastController,
} from '@my/ui/public'
import { BRAND_COLORS } from 'app/constants/colors'
import { api } from 'app/utils/api'

import { ctaButtonStyles } from '../cta-styles'

const STAR_VALUES = [1, 2, 3, 4, 5]

type RateGameSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  gameId: string
  gameName?: string | null
}

export const RateGameSheet = ({ open, onOpenChange, gameId, gameName }: RateGameSheetProps) => {
  const toast = useToastController()
  const utils = api.useUtils()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const mutation = api.reviews.submit.useMutation({
    onSuccess: async () => {
      utils.games.byId.setData({ id: gameId }, (current) =>
        current ? { ...current, hasReview: true } : current
      )
      void utils.games.byId.invalidate({ id: gameId })
      toast.show('Thanks for the feedback')
      onOpenChange(false)
    },
    onError: (error) => toast.show('Unable to send feedback', { message: error.message }),
  })

  useEffect(() => {
    if (!open) return
    setRating(0)
    setComment('')
  }, [gameId, open])

  const isSubmitDisabled = !rating || mutation.isPending
  const submitButtonStyle = isSubmitDisabled ? ctaButtonStyles.neutralSolid : ctaButtonStyles.brandSolid

  const submit = () => {
    if (isSubmitDisabled) return
    Keyboard.dismiss()
    mutation.mutate({ gameId, rating, comment })
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
      animationConfig={{
        type: 'spring',
        damping: 20,
        mass: 1.2,
        stiffness: 250,
      }}
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
                    Rate the game
                  </SizableText>
                  {gameName ? (
                    <Paragraph theme="alt2" size="$2">
                      {gameName}
                    </Paragraph>
                  ) : null}
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
              <Paragraph theme="alt2" size="$2">
                How was the run? Your feedback helps us keep the vibe sharp.
              </Paragraph>
              <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
            </YStack>
            <Separator />
            <YStack px="$4" py="$3" gap="$3">
              <YStack gap="$2">
                <Paragraph fontWeight="600">Rating</Paragraph>
                <XStack gap="$1" ai="center" flexWrap="wrap">
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
                          size={26}
                          color={active ? BRAND_COLORS.primary : '$color8'}
                          fill={active ? BRAND_COLORS.primary : 'transparent'}
                        />
                      </Button>
                    )
                  })}
                  {rating ? (
                    <Paragraph theme="alt2" size="$2">
                      {rating}/5
                    </Paragraph>
                  ) : null}
                </XStack>
                {!rating ? (
                  <Paragraph theme="alt2" size="$2">
                    Tap a star to rate.
                  </Paragraph>
                ) : null}
              </YStack>
              <YStack gap="$1">
                <Paragraph fontWeight="600">Comment</Paragraph>
                <TextArea
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Share a quick note (optional)"
                  placeholderTextColor="$color10"
                  borderRadius={12}
                  borderColor="$borderColor"
                  backgroundColor="$color1"
                  minHeight={120}
                  maxLength={400}
                />
              </YStack>
              <Button
                {...submitButtonBaseProps}
                disabled={isSubmitDisabled}
                onPress={submit}
                iconAfter={mutation.isPending ? <Spinner size="small" /> : undefined}
                {...submitButtonStyle}
              >
                {mutation.isPending ? 'Sending...' : 'Send feedback'}
              </Button>
            </YStack>
          </YStack>
        </TouchableWithoutFeedback>
      </Sheet.Frame>
    </Sheet>
  )
}
