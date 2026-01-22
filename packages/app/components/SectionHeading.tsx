import type { ReactNode } from 'react'

import { SizableText } from '@my/ui/public'

type SectionHeadingProps = {
  children: ReactNode
}

export const SectionHeading = ({ children }: SectionHeadingProps) => {
  return (
    <SizableText size="$5" fontWeight="600" textTransform="uppercase" letterSpacing={1.2}>
      {children}
    </SizableText>
  )
}
