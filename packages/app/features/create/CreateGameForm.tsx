import { FormWrapper, Paragraph, SubmitButton, Theme, YStack, useToastController } from '@my/ui'
import { api } from 'app/utils/api'
import { SchemaForm } from 'app/utils/SchemaForm'

import {
  GameFormSchema,
  buildGameFormDefaults,
  buildGameFormProps,
  serializeGameFormValues,
} from '../games/form-config'

export const CreateGameForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const toast = useToastController()
  const utils = api.useContext()

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

  return (
    <FormWrapper>
      <SchemaForm
        schema={GameFormSchema}
        props={buildGameFormProps()}
        onSubmit={(values) => {
          const payload = serializeGameFormValues(values)
          mutation.mutate(payload)
        }}
        defaultValues={buildGameFormDefaults()}
        renderAfter={({ submit }) => (
          <Theme inverse>
            <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
              Create Game
            </SubmitButton>
          </Theme>
        )}
      >
        {(fields) => (
          <YStack gap="$3">
            <Paragraph theme="alt1">
              Set the schedule, venue, and roster caps. Members will see new games instantly on the
              dashboard.
            </Paragraph>
            {Object.values(fields)}
          </YStack>
        )}
      </SchemaForm>
    </FormWrapper>
  )
}
