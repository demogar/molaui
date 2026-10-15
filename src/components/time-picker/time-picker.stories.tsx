import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '../field/field'
import { DateTimePicker } from './date-time-picker'
import { TimePicker } from './time-picker'
import { toLocalDateTime } from './time-utils'

// Stories pin "now" so the calendar and its bounds are the same in every
// screenshot. Tuesday 6 October 2026.
const TODAY = new Date(2026, 9, 6)

const meta = {
  title: 'Components/Forms/Time picker',
  tags: ['experimental'],
  component: TimePicker,
  parameters: {
    docs: {
      description: {
        component:
          'A time of day as segments — hour, minute and, where the locale keeps a 12-hour clock, the day period — each one a WAI-ARIA **spinbutton**. Up and Down step (the minute by `minuteStep`), Home and End jump to the ends, digits type and move on as soon as no further digit could fit, a separator moves on, Backspace empties. A list of times was rejected: it fixes a granularity the field may not have and reads 1,440 options at one-minute steps.\n\n' +
          'The clock, the segment order, the separator and the day-period words come from `Intl` for the `locale` you pass. The value is `HH:mm`, 24-hour, as `<input type="time">` writes it, and commits on blur or Enter like DatePicker; a draft that is not a time is a sentence that says why. **DateTimePicker** puts a DatePicker and a TimePicker side by side as one `Date`.',
      },
    },
  },
} satisfies Meta<typeof TimePicker>

export default meta
type Story = StoryObj<typeof meta>

function NightlyDemo() {
  const [value, setValue] = useState<string | null>('02:00')
  return (
    <div className="grid max-w-xs gap-3">
      <Field label="Run the nightly evaluation at" hint="Cayuco's evaluation workers run in UTC.">
        {(control) => (
          <TimePicker {...control} name="nightlyAt" locale="en-GB" minuteStep={15} value={value} onValueChange={setValue} />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Submits: <span className="literal text-ink-2">{value ?? '—'}</span>
      </p>
    </div>
  )
}

export const NightlyRun: Story = {
  name: 'Schedule a nightly run',
  parameters: {
    docs: {
      description: {
        story:
          'Inside `Field`, which names the group and each segment ("Run the nightly evaluation at Hour"). en-GB keeps a 24-hour clock, so there is no day period. `minuteStep={15}` makes Up and Down move by a quarter hour; typing still takes any minute.',
      },
    },
  },
  render: () => <NightlyDemo />,
}

export const SupportHours: Story = {
  name: '12-hour clock, with bounds',
  parameters: {
    docs: {
      description: {
        story:
          'en-US adds the day period segment: type "a" or "p", or step it. `min` and `max` bound the time; a time outside is refused with the bound written as the locale writes it — try 8:00 AM.',
      },
    },
  },
  render: () => (
    <div className="max-w-xs">
      <Field label="Hand off to a person after" hint="Cayuco support is staffed from 9:00 AM to 6:00 PM.">
        {(control) => <TimePicker {...control} locale="en-US" min="09:00" max="18:00" defaultValue="17:30" />}
      </Field>
    </div>
  ),
}

function DeployDemo() {
  const [value, setValue] = useState<Date | null>(new Date(2026, 9, 7, 9, 30))
  return (
    <div className="grid max-w-md gap-3">
      <Field label="Deploy the new model at" hint="Deploys start from 9:00 today, Cayuco time.">
        {(control) => (
          <DateTimePicker
            {...control}
            name="deployAt"
            locale="en-GB"
            today={TODAY}
            min={new Date(2026, 9, 6, 9, 0)}
            minuteStep={5}
            value={value}
            onValueChange={setValue}
          />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Submits: <span className="literal text-ink-2">{value ? toLocalDateTime(value) : '—'}</span>
      </p>
    </div>
  )
}

export const DateAndTime: Story = {
  name: 'Date and time',
  parameters: {
    docs: {
      description: {
        story:
          '`DateTimePicker` composes DatePicker and TimePicker: the calendar, its typed date and `open` / `onOpenChange` are DatePicker\'s own. The value is one `Date` in local time, `null` until both halves are filled, and submits as `yyyy-mm-ddThh:mm`. `min` is a moment: days before it are unavailable, and a time before 9:00 on 6 October is refused under both halves.',
      },
    },
  },
  render: () => <DeployDemo />,
}

export const Locales: Story = {
  name: 'Clocks by locale',
  parameters: {
    docs: {
      description: {
        story:
          'The same 21:05, written by each locale: a 12-hour clock with the period after (en-US) or before (ko-KR), the Panamanian "p. m.", and Finnish with a full stop between hour and minute. Nothing is read from a table keyed on the language.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
      {(['en-US', 'es-PA', 'ko-KR', 'fi-FI'] as const).map((locale) => (
        <Field key={locale} label={locale}>
          {(control) => <TimePicker {...control} locale={locale} defaultValue="21:05" />}
        </Field>
      ))}
    </div>
  ),
}

export const States: Story = {
  name: 'Invalid and disabled',
  parameters: {
    docs: {
      description: {
        story:
          'An error from `Field` marks every segment invalid and wears the rojo band. Disabled is stated, not faded: a shaded field with muted digits and the keyline kept.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-xs gap-4">
      <Field label="Pause the agent at" error="Choose a time for the pause.">
        {(control) => <TimePicker {...control} locale="en-GB" />}
      </Field>
      <Field label="Quiet hours start" hint="Set by the workspace owner.">
        {(control) => <TimePicker {...control} locale="en-GB" defaultValue="22:00" disabled />}
      </Field>
    </div>
  ),
}
