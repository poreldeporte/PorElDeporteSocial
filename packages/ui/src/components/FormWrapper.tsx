import { type ComponentProps, forwardRef } from 'react'
import {
  ScrollView,
  type TamaguiElement,
  YStack,
  type YStackProps,
  withStaticProperties,
} from 'tamagui'

/**
 * this is pretty straightforward on web - check FormWrapper.native
 */
const Wrapper = forwardRef<TamaguiElement, YStackProps>(function Wrapper(props, ref) {
  return (
    <YStack
      ref={ref}
      gap="$4"
      f={1}
      jc="center"
      $gtSm={{
        w: '100%',
        maw: 600,
        als: 'center',
      }}
      // $gtSm={{ width: 500, mx: 'auto' }}
      $sm={{ jc: 'space-between' }}
      {...props}
    />
  )
})

type BodyProps = YStackProps & {
  scrollProps?: ComponentProps<typeof ScrollView>
}

const Body = forwardRef<TamaguiElement, BodyProps>(function Body({ scrollProps, ...props }, ref) {
  return (
    <ScrollView {...scrollProps}>
      <YStack p="$4" ref={ref} gap="$2" pb="$8" {...props} />
    </ScrollView>
  )
})

const Footer = forwardRef<TamaguiElement, YStackProps>(function Footer(props, ref) {
  return <YStack ref={ref} pb="$4" px="$4" gap="$4" {...props} />
})

export const FormWrapper = withStaticProperties(Wrapper, {
  Body,
  Footer,
})
