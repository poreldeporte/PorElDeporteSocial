type AuthEvent =
  | 'auth_social_selected'
  | 'auth_magic_link_requested'
  | 'auth_magic_link_succeeded'
  | 'auth_magic_link_failed'

type Payload = Record<string, string | number | boolean | undefined>

const emit = (event: AuthEvent, payload?: Payload) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('analytics', {
        detail: { event, payload },
      })
    )
  }
  if (typeof console !== 'undefined') {
    console.info(`[analytics] ${event}`, payload)
  }
}

export const trackAuthEvent = (event: AuthEvent, payload?: Payload) => {
  emit(event, payload)
}
