import type { ReactNode } from 'react'

import { Paragraph, XStack } from '@my/ui/public'
import { SectionHeading } from 'app/components/SectionHeading'

type SectionTitleProps = {
  children: ReactNode
  meta?: string
  action?: ReactNode
}

export const SectionTitle = ({ children, meta, action }: SectionTitleProps) => (
  <XStack ai="center" jc="space-between" gap="$2" flexWrap="wrap">
    <SectionHeading>{children}</SectionHeading>
    {meta || action ? (
      <XStack ai="center" gap="$2">
        {meta ? (
          <Paragraph theme="alt2" size="$2">
            {meta}
          </Paragraph>
        ) : null}
        {action}
      </XStack>
    ) : null}
  </XStack>
)
