import { Spinner, SpinnerProps, YStack } from 'tamagui'

export const FullscreenSpinner = (props: SpinnerProps) => {
  return (
    <YStack f={1} jc="center" ai="center">
      <Spinner {...props} />
    </YStack>
  )
}
