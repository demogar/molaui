import { DirectionProvider } from '@base-ui/react/direction-provider'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '../field/field'
import { Calendar } from './calendar'
import { DatePicker } from './date-picker'
import { DateRangePicker, formatDateRange } from './date-range-picker'
import { addDays, type DateRange, toISODate } from './date-utils'

// Stories pin "now" so the grid, today's mark and the presets are the same
// in every screenshot. Tuesday 6 October 2026.
const TODAY = new Date(2026, 9, 6)

// Cayuco's release train freezes deploys over weekends and for the week of
// the quarterly model review.
const FREEZE_START = new Date(2026, 9, 19)
const FREEZE_END = new Date(2026, 9, 23)
const deployFreeze = (date: Date) =>
  date.getDay() === 0 || date.getDay() === 6 || (date >= FREEZE_START && date <= FREEZE_END)

const meta = {
  title: 'Components/Forms/Date picker',
  component: DatePicker,
  parameters: {
    docs: {
      // Opens on render, so each story gets its own frame: open overlays
      // inline on the docs page would stack over the text, and a modal one
      // would lock the whole page.
      story: { inline: false, height: '480px' },
      description: {
        component:
          'The WAI-ARIA APG **date picker dialog**: a text input you can type into, and a button that opens a calendar grid in a non-modal dialog (Base UI’s Popover, whose popup is `role="dialog"`). Base UI has no calendar, so the grid owns its keyboard model and keeps to the APG one exactly — arrows by day and week (mirrored in right-to-left), PageUp/PageDown by month, Shift for a year, Home/End to the edges of the week, Enter or Space to choose, Escape to close with focus back on the button.\n\n' +
          'Month and weekday names, digits, the typed order and the first day of the week all come from `Intl` for the `locale` you pass; nothing defaults to `en-US` behind your back. Typed dates commit on blur or Enter, and a refusal is a sentence that says why — try `31/02/2027`, or a day before the minimum. The range picker types too, with a start and an end input inside its popup that share the same parsing and sentences. Values are plain `Date`s at local midnight and submit as `yyyy-mm-dd`; there is no date library, because calendar days need none.',
      },
    },
  },
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

function ScheduleDemo() {
  const [value, setValue] = useState<Date | null>(null)
  return (
    <div className="grid max-w-xs gap-3">
      <Field label="Run evaluation on" required hint="Evaluations start at 02:00 UTC on the chosen day.">
        {(control) => (
          <DatePicker
            {...control}
            name="evaluationDate"
            locale="en-GB"
            today={TODAY}
            min={TODAY}
            max={addDays(TODAY, 90)}
            value={value}
            onValueChange={setValue}
          />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Submits: <span className="literal text-ink-2">{value ? toISODate(value) : '—'}</span>
      </p>
    </div>
  )
}

export const ScheduleEvaluation: Story = {
  name: 'Schedule an evaluation',
  parameters: {
    docs: {
      description: {
        story:
          'Inside `Field`, which supplies the label, hint and required state. `min` is today and `max` is 90 days out: days outside are struck through and named "unavailable", and typing one is refused with the reason.',
      },
    },
  },
  render: () => <ScheduleDemo />,
}

export const DeployFreeze: Story = {
  name: 'Calendar open, with a deploy freeze',
  parameters: {
    docs: {
      story: { inline: false, height: '460px' },
      description: {
        story:
          'Weekends and the review week (19–23 October) are unavailable through `isDateDisabled`. They stay reachable by arrow keys — skipping them would make the grid jump — but cannot be chosen. Today carries a dot and "today" in its name; the chosen day is an ink fill.',
      },
    },
  },
  render: () => (
    <div className="max-w-xs">
      <Field label="Release date" hint="No deploys on weekends or during the model review.">
        {(control) => (
          <DatePicker
            {...control}
            locale="en-GB"
            today={TODAY}
            min={TODAY}
            isDateDisabled={deployFreeze}
            defaultValue={new Date(2026, 9, 14)}
            defaultOpen
          />
        )}
      </Field>
    </div>
  ),
}

function ReportPeriodDemo() {
  const [range, setRange] = useState<DateRange>({ start: addDays(TODAY, -6), end: TODAY })
  return (
    <div className="grid max-w-sm gap-3">
      <Field label="Report period" hint="Agent runs started in this period.">
        {(control) => (
          <DateRangePicker {...control} locale="en-GB" today={TODAY} max={TODAY} value={range} onValueChange={setRange} />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Showing runs for <span className="text-ink-2">{formatDateRange(range, 'en-GB') ?? 'no period'}</span>
      </p>
    </div>
  )
}

export const ReportPeriod: Story = {
  name: 'Range: report period',
  parameters: {
    docs: {
      description: {
        story:
          'The trigger is a button named by its `Field`; the formatted period is its description. Presets are computed from `today`, and one that would reach past `max` is disabled.',
      },
    },
  },
  render: () => <ReportPeriodDemo />,
}

export const RangeOpen: Story = {
  name: 'Range open, with presets',
  parameters: {
    docs: {
      story: { inline: false, height: '480px' },
      description: {
        story:
          'Presets beside the calendar, the active one checked. Above the grid, "Start date" and "End date" inputs take typed dates in the locale’s order (on by default; `typedEntry={false}` removes them). In the grid the two ends are ink fills with an oro edge on their outer side and the days between are a wash, so start, end and inside differ in shape, not only in tint. The status line states the period and its length, or what to choose next. Focus opens on the grid, as the APG dialog pattern and the single picker do; the inputs come before it in Tab order.',
      },
    },
  },
  render: () => (
    <div className="max-w-sm">
      <Field label="Report period">
        {(control) => (
          <DateRangePicker
            {...control}
            locale="en-GB"
            today={TODAY}
            max={TODAY}
            defaultValue={{ start: new Date(2026, 8, 28), end: new Date(2026, 9, 2) }}
            defaultOpen
          />
        )}
      </Field>
    </div>
  ),
}

export const RangeTyped: Story = {
  name: 'Range: typed, in the locale’s order',
  parameters: {
    docs: {
      story: { inline: false, height: '480px' },
      description: {
        story:
          'Typed entry in `de-DE`, which writes DD.MM.YYYY: the placeholder and the visible "Format" line are read from `Intl`, so they can never disagree with what is accepted. Two inputs, not one, because two dates in one box is a format nobody agrees on. They share the single picker’s parsing and sentences and commit on Enter or blur; a committed date moves the grid to its month. An end before the start, a day outside `min`/`max` or an unavailable day is refused with a sentence under the inputs, tied to the input by `aria-describedby`, and the value stays as it was — try typing `01.09.2026` as the end. One end typed alone waits for the other, like one pressed day; a complete range commits and the popup stays open so you can see it drawn. Presets are off here (`presets={[]}`).',
      },
    },
  },
  render: () => (
    <div className="max-w-sm">
      <Field label="Report period" hint="Germany: day, month, year.">
        {(control) => (
          <DateRangePicker
            {...control}
            locale="de-DE"
            today={TODAY}
            max={TODAY}
            presets={[]}
            defaultValue={{ start: new Date(2026, 8, 14), end: new Date(2026, 8, 25) }}
            defaultOpen
          />
        )}
      </Field>
    </div>
  ),
}

export const Locales: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The same component in three locales. `es-PA` starts the week on Sunday and types MM/DD/YYYY, unlike `es-ES`; `ar-EG` starts on Saturday and writes Arabic-Indic digits; `he-IL` starts on Sunday. The right-to-left grids sit inside `dir="rtl"` and `DirectionProvider`, so the week runs right to left and ArrowLeft moves forward.',
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      <section lang="es-PA" className="grid gap-3">
        <h3 className="m-0 rotulo text-ink-2">es-PA</h3>
        <Calendar locale="es-PA" today={TODAY} selected={{ start: new Date(2026, 9, 9), end: new Date(2026, 9, 9) }} />
      </section>
      <DirectionProvider direction="rtl">
        <section lang="ar-EG" dir="rtl" className="grid gap-3">
          <h3 className="m-0 rotulo text-ink-2">ar-EG</h3>
          <Calendar locale="ar-EG" today={TODAY} selected={{ start: new Date(2026, 9, 9), end: new Date(2026, 9, 9) }} />
        </section>
        <section lang="he-IL" dir="rtl" className="grid gap-3">
          <h3 className="m-0 rotulo text-ink-2">he-IL</h3>
          <Calendar
            locale="he-IL"
            today={TODAY}
            selected={{ start: new Date(2026, 9, 12), end: new Date(2026, 9, 15) }}
          />
        </section>
      </DirectionProvider>
    </div>
  ),
}

export const TypedInLocale: Story = {
  name: 'Typed, in the locale’s order',
  parameters: {
    docs: {
      description: {
        story:
          'The placeholder is the locale’s pattern, read from `Intl.DateTimeFormat#formatToParts`, and the input is described by it. Any separator is accepted, and the locale’s own digits too.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-md gap-6 sm:grid-cols-2">
      <div lang="es-PA">
        <Field label="Fecha de corte" hint="Panamá: mes, día, año.">
          {(control) => <DatePicker {...control} locale="es-PA" today={TODAY} defaultValue={new Date(2026, 9, 9)} />}
        </Field>
      </div>
      <Field label="Cut-off date" hint="United Kingdom: day, month, year.">
        {(control) => <DatePicker {...control} locale="en-GB" today={TODAY} defaultValue={new Date(2026, 9, 9)} />}
      </Field>
    </div>
  ),
}

export const Invalid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A rule the picker cannot know — here, "required" on submit — comes from `Field`, with the same rojo band and marked message as every other control. Rules the picker does know (format, a day that does not exist, min, max, unavailable days) it states itself, under the input.',
      },
    },
  },
  render: () => (
    <div className="max-w-xs">
      <Field label="Run evaluation on" required error="Choose the day this evaluation runs.">
        {(control) => <DatePicker {...control} locale="en-GB" today={TODAY} min={TODAY} />}
      </Field>
    </div>
  ),
}

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Stated, not faded: the shade field and muted ink, keyline kept. The calendar button is disabled with it.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-md gap-6 sm:grid-cols-2">
      <Field label="Retention ends" hint="Set by the workspace policy.">
        {(control) => <DatePicker {...control} locale="en-GB" today={TODAY} defaultValue={new Date(2027, 3, 1)} disabled />}
      </Field>
      <Field label="Report period" hint="Locked while the export runs.">
        {(control) => (
          <DateRangePicker
            {...control}
            locale="en-GB"
            today={TODAY}
            defaultValue={{ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) }}
            disabled
          />
        )}
      </Field>
    </div>
  ),
}
