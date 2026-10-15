import type { Meta, StoryObj } from '@storybook/react-vite'
import { Filter } from 'lucide-react'

import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './popover'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { DirectionProvider } from '../../lib/direction'

const meta = {
  title: 'Components/Overlays/Popover',
  tags: ['stable'],
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

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame className="pb-24">
      <HardState state="long-label" className="min-h-72">
        <Popover defaultOpen>
          <PopoverTrigger render={<Button variant="secondary" size="sm">What counts as a step?</Button>} />
          <PopoverContent side="bottom" align="start" aria-label="Steps, explained">
            <p className="m-0 text-sm text-ink-2">
              Every model call and every tool call is one step, including the calls a run retries after a tool times out or returns an error the agent can recover from.
            </p>
          </PopoverContent>
        </Popover>
      </HardState>
      <HardState state="rtl" className="min-h-72">
        <DirectionProvider direction="rtl">
          <Popover defaultOpen>
            <PopoverTrigger render={<Button variant="secondary" size="sm" icon={<Filter />}>الحالة</Button>} />
            <PopoverContent dir="rtl" lang="ar" side="bottom" align="start" title="التصفية حسب الحالة" description="تظهر التشغيلات المطابقة لأي حالة محددة.">
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="sr-only">الحالة</legend>
                {['قيد التشغيل', 'نجح', 'فشل'].map((s, i) => (
                  <Checkbox key={s} label={s} defaultChecked={i < 2} />
                ))}
              </fieldset>
              <div className="mt-4 flex justify-end gap-2">
                <PopoverClose render={<Button variant="ghost" size="sm">إعادة الضبط</Button>} />
                <PopoverClose render={<Button size="sm">تطبيق</Button>} />
              </div>
            </PopoverContent>
          </Popover>
        </DirectionProvider>
      </HardState>
      <HardState state="disabled">
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger disabled render={<Button variant="secondary" size="sm" icon={<Filter />}>Status</Button>} />
            <PopoverContent aria-label="Filter by status">
              <p className="m-0 text-sm text-ink-2">No statuses yet.</p>
            </PopoverContent>
          </Popover>
          <span className="text-sm text-ink-muted">Filters are available once runs exist.</span>
        </div>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      story: { inline: false, height: '640px' },
      description: {
        story:
          'A popover is not modal, so the long and the right-to-left ones are both open. A long explanation wraps inside the popover’s fixed width instead of widening it; in right to left the popover aligns to the trigger’s right edge and its title, checkboxes and buttons mirror; a trigger that cannot open yet is disabled and says why beside it. A popover has no error state of its own: a form inside it shows its own errors.',
      },
    },
  },
}
