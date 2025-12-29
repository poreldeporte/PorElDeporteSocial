import { FormWrapper, Paragraph, SubmitButton, Theme, YStack, useToastController } from '@my/ui/public'
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
              Set the kickoff, venue, and roster cap. Members will see new games instantly on the
              dashboard.
            </Paragraph>
            {fields.start_time}
            {fields.start_time_time}
            {fields.location_name}
            {fields.capacity}
          </YStack>
        )}
      </SchemaForm>
    </FormWrapper>
  )
}
