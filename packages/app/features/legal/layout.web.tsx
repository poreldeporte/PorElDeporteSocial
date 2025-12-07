import { Button, Main, Theme, YStack, isWeb } from '@my/ui/public'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useLink } from 'solito/link'

export type LegalLayoutProps = {
  children?: React.ReactNode
}

export const LegalLayout = ({ children }: LegalLayoutProps) => {
  return (
    <YStack f={1}>
      <YStack
        gap="$1"
        bw="$0"
        bbc="$borderColor"
        bs="solid"
        bbw="$0.5"
        jc="center"
        px="$4"
        bg="$color1"
        f={1}
        ai="center"
      >
        <YStack maw={800} f={1}>
          {isWeb && (
            <Theme>
              <Button
                chromeless
                mt="$4"
                ml="$4"
                als="flex-start"
                // isWeb is a constant so this isn't really a conditional hook
                // eslint-disable-next-line react-hooks/rules-of-hooks
                {...useLink({ href: '/' })}
                icon={ChevronLeft}
              >
                Go Home
              </Button>
            </Theme>
          )}
          <Main>{children}</Main>
        </YStack>
      </YStack>
    </YStack>
  )
}
