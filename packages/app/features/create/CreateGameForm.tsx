import { useRef, type ReactNode } from 'react'
import type { ScrollViewProps } from 'react-native'

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
import { api } from 'app/utils/api'
import { SchemaForm } from 'app/utils/SchemaForm'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import {
  GameFormSchema,
  buildGameFormDefaults,
  buildGameFormProps,
  serializeGameFormValues,
} from '../games/form-config'

export const CreateGameForm = ({
  onSuccess,
  headerSpacer,
  scrollProps,
}: {
  onSuccess: () => void
  headerSpacer?: ReactNode
  scrollProps?: ScrollViewProps
}) => {
  const toast = useToastController()
  const utils = api.useContext()
  const insets = useSafeAreaInsets()
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0
  const submitRef = useRef<(() => void) | null>(null)

  const mutation = api.games.create.useMutation({
    onSuccess: async () => {
      await utils.games.list.invalidate()
      toast.show('Game created')
      onSuccess()
    },
    onError: (error) => {
      toast.show('Unable to create game', {
        message: error.message,
      })
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
            Create Game
          </SubmitButton>
        </Theme>
      )
  const handleSubmit = () => submitRef.current?.()

  return (
    <SchemaForm
      bare
      schema={GameFormSchema}
      props={buildGameFormProps()}
      onSubmit={(values) => {
        const payload = serializeGameFormValues(values)
        mutation.mutate(payload)
      }}
      defaultValues={buildGameFormDefaults()}
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
                Create game
              </SizableText>
              <Paragraph theme="alt2">
                Game details sync instantly with the home feed, so members can claim spots right away.
              </Paragraph>
              <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
            </YStack>
            <YStack gap="$3">
              <Paragraph theme="alt1">
                Set the kickoff, venue, and roster cap. Members will see new games instantly on the
                dashboard.
              </Paragraph>
              {fields.start_time}
              {fields.start_time_time}
              {fields.location_name}
              {fields.capacity}
            </YStack>
            {showFloatingCta ? <YStack h={dockSpacer} /> : null}
          </FormWrapper.Body>
          {showFloatingCta ? (
            <FloatingCtaDock>
              <Theme inverse>
                <XStack>
                  <SubmitButton flex={1} disabled={mutation.isPending} onPress={handleSubmit}>
                    Create Game
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
