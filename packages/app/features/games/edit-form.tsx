import { Paragraph, SubmitButton, Theme, useToastController, YStack } from '@my/ui/public'
import { api } from 'app/utils/api'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { z } from 'zod'

import type { RouterOutputs } from 'app/utils/api'

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
}: {
  game: GameDetail
  onSuccess?: () => void
}) => {
  const toast = useToastController()
  const utils = api.useContext()
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

  return (
    <SchemaForm
      schema={EditGameSchema}
      defaultValues={{
        ...buildGameFormDefaults({
          description: game.description,
          startTime: game.startTime,
          locationName: game.locationName,
          locationNotes: game.locationNotes,
          costCents: game.costCents,
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
      renderAfter={({ submit }) => (
        <Theme inverse>
          <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
            Save changes
          </SubmitButton>
        </Theme>
      )}
    >
      {(fields) => (
        <YStack gap="$3">
          <Paragraph theme="alt1">Adjust schedule, location, or roster caps as needed.</Paragraph>
          {Object.values(fields)}
        </YStack>
      )}
    </SchemaForm>
  )
}
