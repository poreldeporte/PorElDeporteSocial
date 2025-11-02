import { Spinner, YStack, YStackProps } from 'tamagui'

export const LoadingOverlay = (props: YStackProps) => {
  return (
    <YStack bc="$background05" pos="absolute" fullscreen f={1} jc="center" ai="center" {...props}>
      <Spinner />
    </YStack>
  )
}
