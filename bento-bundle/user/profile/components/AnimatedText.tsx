import React, { useMemo } from 'react'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { Text, View, type TextProps } from 'tamagui'

// Constants
const SPRING_CONFIG = {
  damping: 16,
  mass: 0.8,
  stiffness: 180,
} as const

const ANIMATION_DURATION = 100

// Types
interface CharacterObject {
  id: string
  char: string
}

interface AnimatedTextProps extends TextProps {
  /**
   * The text content to animate. Can be a string or number.
   */
  children: string | number
}

// Animated components
const AnimatedView = Animated.createAnimatedComponent(View)
const AnimatedTextView = Animated.createAnimatedComponent(Text)

// Individual character component
const AnimatedCharacter = React.memo(({ char, textProps }: { char: CharacterObject; textProps: TextProps }) => {
  return (
    <AnimatedView
      entering={FadeIn.duration(ANIMATION_DURATION)}
      exiting={FadeOut.duration(ANIMATION_DURATION)}
      key={char.id}
      layout={LinearTransition.springify()
        .damping(SPRING_CONFIG.damping)
        .mass(SPRING_CONFIG.mass)
        .stiffness(SPRING_CONFIG.stiffness)}
    >
      <AnimatedTextView {...textProps}>{char.char}</AnimatedTextView>
    </AnimatedView>
  )
})

AnimatedCharacter.displayName = 'AnimatedCharacter'

/**
 * AnimatedText component that animates individual characters with a spring animation.
 * Each character fades in/out and has a spring-based layout animation.
 */
const AnimatedText = (props: AnimatedTextProps) => {
  const { children, ...textProps } = props

  const splitText: CharacterObject[] = useMemo(() => {
    const text = children.toString()
    let commaCount = 0
    
    return text.split('').map((char, index) => ({
      id: char === ',' ? `comma-${++commaCount}` : `${index}`,
      char,
    }))
  }, [children])

  return (
    <AnimatedView
      layout={LinearTransition.springify()
        .damping(SPRING_CONFIG.damping)
        .mass(SPRING_CONFIG.mass)
        .stiffness(SPRING_CONFIG.stiffness)}
      flexDirection="row"
      flexWrap="wrap"
    >
      {splitText.map((char) => (
        <AnimatedCharacter key={char.id} char={char} textProps={textProps} />
      ))}
    </AnimatedView>
  )
}

export default React.memo(AnimatedText)
