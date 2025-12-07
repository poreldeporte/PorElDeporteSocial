import { config } from '@my/ui/public'

export type Conf = typeof config

declare module '@my/ui/public' {
  interface TamaguiCustomConfig extends Conf {}
}
