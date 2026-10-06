import type { Meta, StoryObj } from '@storybook/react-vite'
import { Filter } from 'lucide-react'

import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './popover'

const meta = {
  title: 'Components/Overlays/Popover',
  component: PopoverContent,
  parameters: {
    layout: 'centered',
    docs: {
      // Opens on render, so each story gets its own frame: open overlays
      // inline on the docs page would stack over the text, and a modal one
      // would lock the whole page.
      story: { inline: false, height: '320px' },
      description: {
        component:
          'A non-modal panel anchored to the control that opened it. The plainest floating surface: raised cloth, the ink keyline, the one blur. **No arrow** — the transform origin already says where it came from, and a zero-radius panel with a triangle bolted on reads as a speech bubble. When given, `title` names the popover and `description` describes it.',
      },
    },
  },
} satisfies Meta<typeof PopoverContent>

export default meta
type Story = StoryObj<typeof meta>

export const ColumnFilter: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant="secondary" size="sm" icon={<Filter />}>Status</Button>} />
      <PopoverContent title="Filter by status" description="Runs matching any checked status are shown.">
        {/* The popover's title already names the group, so the legend is for
            screen readers only. The system Checkbox, not a native one: a
            browser checkbox here was the only rounded, blue-ticked control
            in the library. */}
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="sr-only">Status</legend>
          {['Running', 'Succeeded', 'Failed', 'Cancelled'].map((s, i) => (
            <Checkbox key={s} label={s} defaultChecked={i < 3} />
          ))}
        </fieldset>
        <div className="mt-4 flex justify-end gap-2">
          <PopoverClose render={<Button variant="ghost" size="sm">Reset</Button>} />
          <PopoverClose render={<Button size="sm">Apply</Button>} />
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const Plain: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="secondary">What is a step budget?</Button>} />
      <PopoverContent side="top" align="center" aria-label="Step budget">
        <p className="m-0 text-sm text-ink-2">
          The most model calls one run may make. It stops loops from spending the month’s tokens in an afternoon.
        </p>
      </PopoverContent>
    </Popover>
  ),
}
