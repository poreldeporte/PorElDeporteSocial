import { X } from '@tamagui/lucide-icons'
import { CreateScreen } from 'app/features/create/screen'
import { Button, Dialog, Unspaced } from 'tamagui'

export function CreateModal({
  toggleEvent,
  setToggleEvent,
}: {
  toggleEvent: boolean
  setToggleEvent: (e: boolean) => void
}) {
  return (
    <Dialog modal open={toggleEvent} onOpenChange={setToggleEvent}>
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
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
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
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          gap="$4"
          w="100%"
          h="100%"
          $gtSm={{
            height: 'auto',
            maxWidth: 660,
          }}
          pt="$8"
          px="$0"
        >
          <CreateScreen />
          <Unspaced>
            <Dialog.Close asChild>
              <Button position="absolute" top="$3" right="$3" size="$2" circular icon={X} />
            </Dialog.Close>
          </Unspaced>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
