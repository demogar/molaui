import type { Meta, StoryObj } from '@storybook/react-vite'

import { Container } from './container'
import { Section, SectionHeader } from './section'
import { Button } from '../button'

const meta = {
  title: 'Components/Layout/Container',
  component: Container,
  args: { size: 'page' },
  argTypes: { size: { control: 'inline-radio', options: ['prose', 'page', 'wide', 'full'] } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`page` is the editorial width the system was born at; `wide` is for tools, where a twelve-column table deserves the screen; `prose` is the reading measure and never widens. Gutters move with density.',
      },
    },
  },
  render: (args) => (
    <Container {...args}>
      <Section>
        <SectionHeader
          title="Experiments"
          lead="Every test running on the growth platform, with its guardrails."
          label="Growth platform"
          actions={<Button size="sm">New experiment</Button>}
        />
        <div className="h-32 bg-cloth-pale relleno-field shadow-cut" />
      </Section>
    </Container>
  ),
} satisfies Meta<typeof Container>

export default meta
type Story = StoryObj<typeof meta>

export const Page: Story = {}

export const Wide: Story = { args: { size: 'wide' } }
