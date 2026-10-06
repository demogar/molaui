import type { Meta, StoryObj } from '@storybook/react-vite'

import { Breadcrumb, middleTruncate } from './breadcrumb'

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  args: {
    items: [
      { label: 'Workspace', href: '#' },
      { label: 'Agents', href: '#' },
      { label: 'knowledge-agent', href: '#' },
      { label: 'Run #4182' },
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          'A named `<nav>` around an ordered list. The current page is text with `aria-current="page"` — a link to where you already are does nothing. Separators are drawn in CSS so a screen reader reads places, not slashes. Long ids are cut in the middle with `middleTruncate`, keeping both ends — the parts people compare.',
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongIds: Story = {
  args: {
    items: [
      { label: 'Traces', href: '#' },
      { label: <span title="run_8f3a2b91d07e44c21e">{middleTruncate('run_8f3a2b91d07e44c21e')}</span>, href: '#' },
      { label: 'Step 7 · search_kb' },
    ],
  },
}
