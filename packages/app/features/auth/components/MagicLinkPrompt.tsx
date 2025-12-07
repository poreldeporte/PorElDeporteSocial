import { Paragraph, XStack } from '@my/ui/public'

type MagicLinkPromptProps = {
  email?: string
  disabled?: boolean
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
  onSend: () => void
}

export const MagicLinkPrompt = ({
  email,
  disabled,
  status,
  error,
  onSend,
}: MagicLinkPromptProps) => {
  if (!email) return null
  const message =
    status === 'success'
      ? `Link sent to ${email}`
      : status === 'error'
      ? error
      : undefined

  return (
    <XStack ai="center" gap="$2" flexWrap="wrap">
      <Paragraph size="$2" theme="alt1">
        Prefer passwordless?
      </Paragraph>
      <Paragraph
        size="$2"
        theme={status === 'error' ? 'red' : disabled ? 'alt2' : 'alt1'}
        textDecorationLine={disabled ? 'none' : 'underline'}
        onPress={disabled ? undefined : onSend}
      >
        {status === 'loading' ? 'Sending…' : 'Email me a magic link'}
      </Paragraph>
      {message ? (
        <Paragraph size="$2" theme={status === 'error' ? 'red' : 'alt1'}>
          {message}
        </Paragraph>
      ) : null}
    </XStack>
  )
}
