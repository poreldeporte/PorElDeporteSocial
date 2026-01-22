import type { ReactNode } from 'react'
import { AlertDialog, Button, Paragraph, Spinner, XStack } from 'tamagui'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  confirmTone?: 'default' | 'destructive'
  confirmPending?: boolean
  confirmDisabled?: boolean
}

const baseButtonProps = {
  size: '$3',
  br: '$10',
  flex: 1,
  pressStyle: { opacity: 0.85 },
} as const

const defaultConfirmStyle = {
  backgroundColor: '$color12',
  borderColor: '$color12',
  color: '$background',
} as const

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmTone = 'default',
  confirmPending = false,
  confirmDisabled = false,
}: ConfirmDialogProps) => {
  const confirmStyle =
    confirmTone === 'destructive' ? { theme: 'red' } : defaultConfirmStyle

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="medium"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          o={0.5}
        />
        <AlertDialog.Content
          key="content"
          elevate
          animation="medium"
          enterStyle={{ opacity: 0, scale: 0.95 }}
          exitStyle={{ opacity: 0, scale: 0.95 }}
          backgroundColor="$color2"
          br="$4"
          borderWidth={1}
          borderColor="$color12"
          p="$4"
          gap="$3"
          w="90%"
          maxWidth={420}
        >
          <AlertDialog.Title fontWeight="700">{title}</AlertDialog.Title>
          {description ? (
            <AlertDialog.Description>
              {typeof description === 'string' ? (
                <Paragraph theme="alt2">{description}</Paragraph>
              ) : (
                description
              )}
            </AlertDialog.Description>
          ) : null}
          <XStack gap="$3">
            {cancelLabel ? (
              <Button
                {...baseButtonProps}
                variant="outlined"
                onPress={() => {
                  onCancel?.()
                  onOpenChange(false)
                }}
                disabled={confirmPending}
              >
                {cancelLabel}
              </Button>
            ) : null}
            <Button
              {...baseButtonProps}
              {...confirmStyle}
              onPress={onConfirm}
              disabled={confirmDisabled || confirmPending}
              iconAfter={confirmPending ? <Spinner size="small" /> : undefined}
            >
              {confirmLabel}
            </Button>
          </XStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  )
}
