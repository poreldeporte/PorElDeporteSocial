import { useToastController, Spinner, H2 } from '@my/ui/public'
import { api } from 'app/utils/api'
import { getBaseUrl } from 'app/utils/getBaseUrl'
import { useEffect } from 'react'
import { Platform } from 'react-native'

export const Greetings = () => {
  const baseUrl = getBaseUrl()
  const { data, isPending, isError } = api.greeting.greet.useQuery(undefined)
  const toast = useToastController()
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android'
  useEffect(() => {
    data &&
      toast.show('tRPC server connected.', {
        native: isNative,
        duration: 2000,
        burntOptions: {
          from: 'top',
          preset: 'done',
        },
      })
    isError &&
      toast.show(`Error connecting to tPRC server. ${baseUrl}`, {
        native: isNative,
        burntOptions: {
          preset: 'error',
          shouldDismissByDrag: true,
          from: 'bottom',
        },
      })
    if (isError) {
      console.error(
        `Tried to connect to tRPC server at ${baseUrl} but got an error. Run next.js server with 'yarn web -H ${
          baseUrl.split('://')[1].split(':')[0]
        }' to fix..`
      )
    }
  }, [data, isError, toast])
  return (
    <H2 m="$4">
      {isPending ? <Spinner /> : null}
      {data ? data : null}
    </H2>
  )
}
