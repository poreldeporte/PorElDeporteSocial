import { SwatchBook, X } from '@tamagui/lucide-icons'
import { ReactNode, useState } from 'react'
import {
  Button,
  Paragraph,
  Popover,
  Square,
  Tooltip,
  TooltipGroup,
  YStack,
} from 'tamagui'
import { SizableText } from 'tamagui'

import { type ShowcaseTheme, useShowCaseView } from './ShowcaseProvider'

const themes: Record<ShowcaseTheme, any> = {
  default: '🐤',
  monokai: '🐽',
  dracula: '🧛‍♂️',
}

export const ThemeButton = () => {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useShowCaseView('ShowcaseProvider')
  //

  return (
    <Popover
      size="$5"
      open={open}
      onOpenChange={setOpen}
      hoverable
      stayInFrame
      offset={15}
      placement="top"
    >
      <Popover.Trigger asChild>
        <Button animation="200ms" circular size="$3" py="$2">
          <Button.Icon>{open ? <X /> : <SwatchBook />}</Button.Icon>
        </Button>
      </Popover.Trigger>

      <Popover.Content
        borderWidth={1}
        borderColor="$borderColor"
        maxWidth={120}
        enterStyle={{ y: -10, opacity: 0 }}
        exitStyle={{ y: -10, opacity: 0 }}
        elevate
        br="$12"
        p={0}
        ov="hidden"
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <TooltipGroup delay={{ open: 100 }}>
          <YStack>
            {Object.entries(themes).map(([key, optionName]) => {
              return (
                <Tooltip placement="left" key={key}>
                  <Tooltip.Trigger>
                    <Square
                      key={key}
                      size="$4"
                      $maxMd={{ size: '$5' }}
                      hoverStyle={{
                        bg: '$backgroundHover',
                      }}
                      pressStyle={{
                        bg: '$backgroundPress',
                      }}
                      cursor="pointer"
                      {...(theme === key && {
                        bg: '$color5',
                        hoverStyle: {
                          bg: '$color5',
                        },
                      })}
                      onPress={(e) => {
                        e.stopPropagation()
                        setTheme(key as ShowcaseTheme)
                      }}
                    >
                      <SizableText size="$6" cursor="default">
                        {themes[key]}
                      </SizableText>
                    </Square>
                  </Tooltip.Trigger>

                  <Tooltip.Content
                    enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                    exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                    scale={1}
                    x={0}
                    y={0}
                    opacity={1}
                    animation={[
                      'quick',
                      {
                        opacity: {
                          overshootClamping: true,
                        },
                      },
                    ]}
                  >
                    <Tooltip.Arrow />
                    <Paragraph size="$2" lineHeight="$1">
                      {key}
                    </Paragraph>
                  </Tooltip.Content>
                </Tooltip>
              )
            })}
          </YStack>
        </TooltipGroup>
      </Popover.Content>
    </Popover>
  )
}
