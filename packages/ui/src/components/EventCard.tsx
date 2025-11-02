import { useState } from 'react'
import type { useLink } from 'solito/link'
import { Button, Card, type CardProps, H6, Paragraph, Theme, type ThemeName, XStack } from 'tamagui'

import { EventModal } from './EventModal'

export type EventCardTypes = {
  title?: string
  description?: string
  action?: {
    props: ReturnType<typeof useLink>
    text: string
  }
  tags?: { text: string; theme: ThemeName }[]
} & CardProps

export const EventCard = ({ title, description, action, tags = [], ...props }: EventCardTypes) => {
  const [toggleEvent, setToggleEvent] = useState(false)
  const [hover, setHover] = useState(false)
  return (
    <Card
      cursor="pointer"
      gap="$3"
      p="$4"
      borderRadius="$3"
      chromeless={!hover}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      {...props}
      onPress={() => setToggleEvent((prev) => !prev)}
    >
      <EventModal toggleEvent={toggleEvent} eventData={{ title, tags, description }} />
      <XStack gap="$3" flexDirection="column">
        <H6 size="$5" tt="capitalize">
          {title}
        </H6>
        <XStack gap="$1" marginHorizontal="$-2">
          {tags.map((tag) => (
            <Theme key={tag.text} name={tag.theme}>
              <Button size="$1" px="$2" br="$10" disabled>
                {tag.text}
              </Button>
            </Theme>
          ))}
        </XStack>
      </XStack>

      <XStack gap="$1" ai="center">
        {description ? (
          <Paragraph>
            {description.length > 150 ? `${description.slice(0, 150)}...` : description}
          </Paragraph>
        ) : null}
      </XStack>

      {/* {action && (
        <Button iconAfter={ArrowUpRight} size="$2" als="flex-end" {...action.props}>
          {action?.text}
        </Button>
      )} */}
    </Card>
  )
}
