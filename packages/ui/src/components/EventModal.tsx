import { X } from '@tamagui/lucide-icons'
import { Button, Dialog, Theme, ThemeName, Unspaced, XStack } from 'tamagui'

export function EventModal({
  toggleEvent,
  eventData,
}: {
  toggleEvent: boolean
  eventData: { title?: string; tags: { text: string; theme: string }[]; description?: string }
}) {
  return (
    <Dialog modal open={toggleEvent}>
      {/* <Dialog.Trigger asChild>
        <Button>Show Dialog</Button>
      </Dialog.Trigger> */}
      {/* <Adapt when="sm" platform="touch">
        <Sheet animation="medium" zIndex={200000} modal dismissOnSnapToBottom>
          <Sheet.Frame padding="$4" gap="$4">
            <Adapt.Contents />
          </Sheet.Frame>

          <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        </Sheet>
      </Adapt> */}
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="slow"
          o={0.5}
          enterStyle={{ o: 0 }}
          exitStyle={{ o: 0 }}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animateOnly={['transform', 'opacity']}
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, o: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, o: 0, scale: 0.95 }}
          gap="$4"
          style={{ maxWidth: 650, minWidth: 650 }}
        >
          <Dialog.Title>{eventData?.title}</Dialog.Title>

          <Dialog.Description>{eventData?.description}</Dialog.Description>

          <XStack gap="$1">
            {eventData.tags.map((tag) => (
              <Theme key={tag.text} name={tag.theme as ThemeName}>
                <Button size="$1" px="$2" br="$10" disabled>
                  {tag.text}
                </Button>
              </Theme>
            ))}
          </XStack>

          <Unspaced>
            <Dialog.Close asChild>
              <Button pos="absolute" t="$3" r="$3" size="$2" circular icon={X} />
            </Dialog.Close>
          </Unspaced>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
