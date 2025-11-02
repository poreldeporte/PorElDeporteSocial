import { XStack, XStackProps, YStack, YStackProps, withStaticProperties } from 'tamagui'

const KVTableWrapper = (props: YStackProps) => {
  return <YStack gap="$6" {...props} />
}

const KVTableRow = (props: XStackProps) => {
  return (
    <XStack
      $sm={{
        fd: 'column',
      }}
      gap="$3"
      fw="wrap"
      {...props}
    />
  )
}

const KVTableKey = (props: YStackProps) => {
  return (
    <YStack
      w="23%"
      $sm={{
        w: '100%',
      }}
      {...props}
    />
  )
}

const KVTableValue = (props: XStackProps) => {
  return (
    <XStack
      w="72%"
      $sm={{
        w: '100%',
      }}
      fw="wrap"
      {...props}
    />
  )
}

/**
 * simple key-value table for displaying info
 */
export const KVTable = withStaticProperties(KVTableWrapper, {
  Row: KVTableRow,
  Key: KVTableKey,
  Value: KVTableValue,
})
