import { LinearGradient } from '@tamagui/linear-gradient'
import { ChevronRight } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { AnimatePresence, Card, CardProps, ColorTokens, YStack } from 'tamagui'

export const Banner = ({
  children,
  colors = ['$color4', '$color4', '$color6'],
  ...props
}: {
  colors?: ColorTokens[]
} & CardProps) => {
  const [hover, setHover] = useState(false)
  return (
    <Card {...props} br="$4" onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}>
      <Card.Header padded scale={hover ? 1.01 : 1} animation="bouncy" gap="$2">
        {children}
      </Card.Header>
      <Card.Background>
        <Card.Background br="$4">
          <LinearGradient
            scale={4}
            x={hover ? -300 : 50}
            animation="bouncy"
            br="$2"
            w="100%"
            h="100%"
            colors={colors}
            start={[0, 0]}
            end={[1, 1]}
          />
        </Card.Background>
      </Card.Background>
      <Card.Background ai="flex-end">
        <AnimatePresence>
          {hover && (
            <YStack
              pr="$5"
              pt="$3.5"
              animation="bouncy"
              enterStyle={{ x: -6, o: 0 }}
              exitStyle={{ x: -6, o: 0 }}
              x={0}
              o={0.9}
            >
              <ChevronRight size={20} />
            </YStack>
          )}
        </AnimatePresence>
      </Card.Background>
    </Card>
  )
}
