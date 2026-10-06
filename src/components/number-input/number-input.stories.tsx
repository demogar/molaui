import { DirectionProvider } from '@base-ui/react/direction-provider'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '../field/field'
import { NumberInput } from './number-input'

const meta = {
  title: 'Components/Forms/Number input',
  component: NumberInput,
  parameters: {
    docs: {
      description: {
        component:
          'Base UI’s NumberField in the system’s cut: typed, stepped and formatted with `Intl.NumberFormat` for the `locale` you pass. ArrowUp/Down step by `step`, Shift by `largeStep`, Alt by `smallStep`, Home/End jump to the bounds, and PageUp/PageDown step by `largeStep` as the APG spinbutton pattern asks.\n\n' +
          'The − and + steppers sit inside the keyline at the end, so a number field is one shape the height of every other control; they are not tab stops, because the arrows already do their job. **The wheel is off by default** — in a long form the wheel is how people scroll, and a value that changed under the pointer is a silent edit. A `unit` suffix is added to the accessible description; for units Intl knows, a `format` puts the unit in the value itself, localised.',
      },
    },
  },
} satisfies Meta<typeof NumberInput>

export default meta
type Story = StoryObj<typeof meta>

function BudgetDemo() {
  const [value, setValue] = useState<number | null>(40000)
  return (
    <div className="grid max-w-xs gap-3">
      <Field label="Token budget per run" required hint="The run stops and reports when it reaches the budget.">
        {(control) => (
          <NumberInput
            {...control}
            name="tokenBudget"
            locale="en-US"
            unit="tokens"
            min={1000}
            max={200000}
            step={1000}
            largeStep={10000}
            value={value}
            onValueChange={setValue}
          />
        )}
      </Field>
      <p className="m-0 text-xs text-ink-muted">
        Submits: <span className="literal text-ink-2">{value ?? '—'}</span>
      </p>
    </div>
  )
}

export const Default: Story = {
  render: () => <BudgetDemo />,
}

export const RunLimits: Story = {
  name: 'Run limits (formats and units)',
  parameters: {
    docs: {
      description: {
        story:
          'Four ways a number carries its meaning: an Intl unit (`style: "unit"`, seconds), a currency, a percentage, and a plain count with a suffix. Each is formatted for `en-US` here; the next story shows the same fields in other locales.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
      <Field label="Step timeout" hint="Per tool call. Shift+Arrow steps by 30 s.">
        {(control) => (
          <NumberInput
            {...control}
            locale="en-US"
            format={{ style: 'unit', unit: 'second', unitDisplay: 'short' }}
            min={5}
            max={600}
            step={5}
            largeStep={30}
            defaultValue={90}
          />
        )}
      </Field>
      <Field label="Monthly spend cap" hint="Runs pause when the workspace reaches it.">
        {(control) => (
          <NumberInput
            {...control}
            locale="en-US"
            format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
            min={0}
            step={50}
            largeStep={500}
            defaultValue={2500}
          />
        )}
      </Field>
      <Field label="Traffic to the new prompt" hint="The rest stays on the current version.">
        {(control) => (
          <NumberInput
            {...control}
            locale="en-US"
            format={{ style: 'percent' }}
            min={0}
            max={1}
            step={0.05}
            largeStep={0.25}
            defaultValue={0.1}
          />
        )}
      </Field>
      <Field label="Retries before halting">
        {(control) => <NumberInput {...control} locale="en-US" unit="attempts" min={0} max={5} defaultValue={2} />}
      </Field>
    </div>
  ),
}

export const Locales: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The same number in three locales. `es-PA` writes 1,500.5 exactly as `en-US` does, and `de-DE` writes 1.500,5 — the language does not tell you the separators, which is why the locale is passed rather than guessed. `ar-EG`, inside a right-to-left region, gets Arabic-Indic digits from Intl and the steppers at the visual start. ArrowUp still means "more" in every direction.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-3xl gap-6 sm:grid-cols-3">
      <Field label="Presupuesto (es-PA)" hint="Tokens por ejecución.">
        {(control) => <NumberInput {...control} locale="es-PA" min={0} step={0.5} largeStep={100} defaultValue={1500.5} />}
      </Field>
      <Field label="Budget (de-DE)" hint="Tokens pro Lauf.">
        {(control) => <NumberInput {...control} locale="de-DE" min={0} step={0.5} largeStep={100} defaultValue={1500.5} />}
      </Field>
      <DirectionProvider direction="rtl">
        <div dir="rtl" lang="ar">
          <Field label="الميزانية (ar-EG)" hint="عدد الرموز لكل تشغيل.">
            {(control) => <NumberInput {...control} locale="ar-EG" min={0} step={0.5} largeStep={100} defaultValue={1500.5} />}
          </Field>
        </div>
      </DirectionProvider>
    </div>
  ),
}

export const WheelScrub: Story = {
  name: 'Wheel scrub (opt-in)',
  parameters: {
    docs: {
      description: {
        story:
          'With `allowWheelScrub`, the wheel changes the value while the field is focused and the pointer is over it. Use it for a field that is the point of its screen, like this playground control, not in a long form.',
      },
    },
  },
  render: () => (
    <div className="max-w-xs">
      <Field label="Temperature" hint="Focus, then scroll over the field.">
        {(control) => (
          <NumberInput {...control} locale="en-US" allowWheelScrub min={0} max={1} step={0.05} largeStep={0.25} defaultValue={0.3} />
        )}
      </Field>
    </div>
  ),
}

export const InvalidAndDisabled: Story = {
  name: 'Invalid and disabled',
  render: () => (
    <div className="grid max-w-xs gap-6">
      <Field label="Concurrent runs" required error="The workspace allows at most 8 concurrent runs.">
        {(control) => <NumberInput {...control} locale="en-US" min={1} defaultValue={12} unit="runs" />}
      </Field>
      <Field label="Seats" hint="Set by your plan.">
        {(control) => <NumberInput {...control} locale="en-US" defaultValue={25} disabled />}
      </Field>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="grid max-w-xs gap-3">
      <NumberInput aria-label="Small" size="sm" locale="en-US" defaultValue={8} />
      <NumberInput aria-label="Medium" locale="en-US" defaultValue={8} />
      <NumberInput aria-label="Large" size="lg" locale="en-US" defaultValue={8} />
    </div>
  ),
}
