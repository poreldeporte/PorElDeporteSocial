import { Meta, StoryObj } from '@storybook/react'
import { YStack } from 'tamagui'

import { FullscreenSpinner } from './FullscreenSpinner'

const meta: Meta<typeof FullscreenSpinner> = {
  title: 'ui/FullscreenSpinner',
  parameters: { layout: 'fullscreen' },
  component: FullscreenSpinner,
  render: (props) => (
    <YStack h="100%">
      <FullscreenSpinner {...props} />
    </YStack>
  ),
}

type Story = StoryObj<typeof FullscreenSpinner>

export const Basic: Story = {}

export default meta
