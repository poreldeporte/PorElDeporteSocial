import { Meta, StoryObj } from '@storybook/react'
import { YStack } from 'tamagui'

import { TodoCard } from './TodoCard'

const meta: Meta<typeof TodoCard> = {
  title: 'ui/TodoCard',
  parameters: { layout: 'centered' },
  component: TodoCard,
  render: (props) => (
    <YStack w={400}>
      <TodoCard {...props} />
    </YStack>
  ),
}

type Story = StoryObj<typeof TodoCard>

export const Unchecked: Story = {
  args: {
    label: 'Contribute to Tamagui',
    checked: false,
  },
}

export const Checked: Story = {
  args: {
    label: 'Purchase Takeout',
    checked: true,
    theme: 'green_alt2',
  },
}

export default meta
