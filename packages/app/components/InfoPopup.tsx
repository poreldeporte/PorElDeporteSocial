import type { ReactNode } from 'react'

import { Button, Card, Dialog, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { X } from '@tamagui/lucide-icons'

type InfoPopupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  bullets?: string[]
  footer?: string
}

export const InfoPopup = ({
  open,
  onOpenChange,
  title,
  description,
  bullets = [],
  footer,
}: InfoPopupProps) => {
  const hasBullets = bullets.length > 0
  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          o={0.5}
          enterStyle={{ o: 0 }}
          exitStyle={{ o: 0 }}
          onPress={() => onOpenChange(false)}
          zIndex={200000}
        />
        <Dialog.Content
          key="content"
          animation="quick"
          enterStyle={{ opacity: 0, scale: 0.96 }}
          exitStyle={{ opacity: 0, scale: 0.98 }}
          backgroundColor="transparent"
          borderWidth={0}
          p={0}
          ai="center"
          jc="center"
          zIndex={200001}
        >
          <Card
            bordered
            bw={1}
            boc="$color12"
            br="$5"
            p="$5"
            gap="$4"
            backgroundColor="$background"
            w="90%"
            maxWidth={360}
          >
            <YStack gap="$2">
              <XStack ai="center" jc="space-between" gap="$2">
                <SizableText
                  size="$5"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing={1.2}
                  color="$color12"
                >
                  {title}
                </SizableText>
                <Button
                  chromeless
                  size="$2"
                  icon={X}
                  onPress={() => onOpenChange(false)}
                  aria-label="Close"
                  pressStyle={{ opacity: 0.7 }}
                />
              </XStack>
              <YStack h={2} w={56} br={999} bg="$color12" />
            </YStack>
            <YStack gap="$3">
              <Paragraph theme="alt2" color="$color12" lineHeight={22}>
                {description}
              </Paragraph>
              {hasBullets ? (
                <YStack bw={1} boc="$color12" br="$4" p="$3" gap="$2.5">
                  <XStack ai="center" gap="$2">
                    <YStack f={1} h={1} bg="$color12" opacity={0.35} />
                    <Paragraph
                      size="$2"
                      theme="alt2"
                      textTransform="uppercase"
                      letterSpacing={1.2}
                      color="$color12"
                      textAlign="right"
                    >
                      How it works
                    </Paragraph>
                  </XStack>
                  <YStack gap="$2.5">
                    {bullets.map((text) => (
                      <XStack key={text} gap="$2" ai="flex-start">
                        <YStack w={6} h={6} br={999} bg="$color10" mt={6} />
                        <Paragraph theme="alt2" lineHeight={22}>
                          {text}
                        </Paragraph>
                      </XStack>
                    ))}
                  </YStack>
                </YStack>
              ) : null}
              {footer ? (
                <Paragraph theme="alt2" color="$color12" lineHeight={22}>
                  {footer}
                </Paragraph>
              ) : null}
            </YStack>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
