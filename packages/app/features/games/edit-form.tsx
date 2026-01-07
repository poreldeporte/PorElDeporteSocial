import { useRef, type ReactNode } from 'react'
import type { ScrollViewProps } from 'react-native'

import { z } from 'zod'

import {
  FormWrapper,
  Paragraph,
  SizableText,
  SubmitButton,
  Theme,
  XStack,
  YStack,
  isWeb,
  useToastController,
} from '@my/ui/public'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { BRAND_COLORS } from 'app/constants/colors'
import { getDockSpacer } from 'app/constants/dock'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { api, type RouterOutputs } from 'app/utils/api'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import {
  GameFormSchema,
  buildGameFormDefaults,
  buildGameFormProps,
  serializeGameFormValues,
} from './form-config'

type GameDetail = RouterOutputs['games']['byId']

const EditGameSchema = GameFormSchema.extend({
  status: formFields.select.describe('Status'),
})

const statusOptions = [
  { name: 'Scheduled', value: 'scheduled' },
  { name: 'Locked', value: 'locked' },
  { name: 'Completed', value: 'completed' },
  { name: 'Cancelled', value: 'cancelled' },
]

export const EditGameForm = ({
  game,
  onSuccess,
  scrollProps,
  headerSpacer,
}: {
  game: GameDetail
  onSuccess?: () => void
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
}) => {
  const toast = useToastController()
  const utils = api.useContext()
  const insets = useSafeAreaInsets()
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0
  const submitRef = useRef<(() => void) | null>(null)
  const mutation = api.games.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.games.byId.invalidate({ id: game.id }), utils.games.list.invalidate()])
      toast.show('Game updated')
      onSuccess?.()
    },
    onError: (error) => {
      toast.show('Unable to update game', { message: error.message })
    },
  })
  const renderAfter = showFloatingCta
    ? ({ submit }: { submit: () => void }) => {
        submitRef.current = submit
        return null
      }
    : ({ submit }: { submit: () => void }) => (
        <Theme inverse>
          <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
            Save changes
          </SubmitButton>
        </Theme>
      )
  const handleSubmit = () => submitRef.current?.()

  return (
    <SchemaForm
      bare
      schema={EditGameSchema}
      defaultValues={{
        ...buildGameFormDefaults({
          startTime: game.startTime,
          locationName: game.locationName,
          capacity: game.capacity,
        }),
        status: game.status,
      }}
      props={{
        ...buildGameFormProps(),
        status: {
          options: statusOptions,
        },
      }}
      onSubmit={(values) =>
        mutation.mutate({
          id: game.id,
          ...serializeGameFormValues(values),
          status: values.status as GameDetail['status'],
        })
      }
      renderAfter={renderAfter}
    >
      {(fields) => (
        <>
          <FormWrapper.Body
            p={0}
            px={SCREEN_CONTENT_PADDING.horizontal}
            pt={headerSpacer ? 0 : SCREEN_CONTENT_PADDING.top}
            pb={SCREEN_CONTENT_PADDING.bottom}
            gap="$4"
            scrollProps={scrollProps}
          >
            {headerSpacer}
            <YStack gap="$2">
              <SizableText size="$7" fontWeight="700">
                Game Settings
              </SizableText>
              <Paragraph theme="alt2">
                Make sure any roster changes are communicated to the players.
              </Paragraph>
              <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
            </YStack>
            <YStack gap="$3">
              <Paragraph theme="alt1">Adjust schedule, venue, roster cap, or status.</Paragraph>
              {fields.start_time}
              {fields.start_time_time}
              {fields.location_name}
              {fields.capacity}
              {fields.status}
            </YStack>
            {showFloatingCta ? <YStack h={dockSpacer} /> : null}
          </FormWrapper.Body>
          {showFloatingCta ? (
            <FloatingCtaDock>
              <Theme inverse>
                <XStack>
                  <SubmitButton flex={1} disabled={mutation.isPending} onPress={handleSubmit}>
                    Save changes
                  </SubmitButton>
                </XStack>
              </Theme>
            </FloatingCtaDock>
          ) : null}
        </>
      )}
    </SchemaForm>
  )
}
