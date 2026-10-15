import type { Meta, StoryObj } from '@storybook/react-vite'

import { Breadcrumb, middleTruncate } from './breadcrumb'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  tags: ['stable'],
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
          'A named `<nav>` around an ordered list. The current page is text with `aria-current="page"` — a link to where you already are does nothing. Separators are slanted keyline rules drawn in CSS, with no text, so a screen reader reads places, not slashes. Long ids are cut in the middle with `middleTruncate`, keeping both ends — the parts people compare.',
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

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Breadcrumb
          aria-label="Breadcrumb, long names"
          items={[
            { label: 'Cayuco support operations workspace', href: '#' },
            { label: 'Refund and chargeback triage agent', href: '#' },
            { label: 'Run #4182 · escalated to a person after three failed lookups' },
          ]}
        />
      </HardState>
      <HardState state="rtl">
        <Breadcrumb
          aria-label="مسار التنقل"
          items={[
            { label: 'مساحة العمل', href: '#' },
            { label: 'الوكلاء', href: '#' },
            { label: 'التشغيل ٤١٨٢' },
          ]}
        />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Long names wrap onto a second line rather than overflowing, and the current page truncates last; in right to left the trail runs from the right. A breadcrumb has no disabled or error state: every crumb is a place you can go, and the current page is text, not a disabled link.',
      },
    },
  },
}
