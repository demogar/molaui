import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { Meter, Progress } from './progress'

const meta = {
  title: 'Components/Feedback/Progress',
  component: Progress,
  args: { label: 'Embedding documents', value: 42 },
  parameters: {
    docs: {
      description: {
        component:
          '**Progress** is work moving toward done; **Meter** is a reading inside a known range. Two components, because they are two roles (`progressbar`, `meter`) and only one of them can be indeterminate. An indeterminate progress is the **working relleno** — the same texture a loading button and a running toast carry, so one mark means “this is being cut” everywhere.',
      },
    },
  },
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Determinate: Story = {}

export const Indeterminate: Story = {
  args: { label: 'Waiting for the model to start streaming', value: null },
}

function Ticking() {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setValue((v) => (v >= 300 ? 0 : v + 7)), 300)
    return () => clearInterval(id)
  }, [])
  return (
    <Progress
      label="Evaluating prompts"
      value={Math.min(value, 300)}
      max={300}
      valueText={(_, v) => `${v ?? 0} / 300`}
    />
  )
}

export const Live: Story = { render: () => <Ticking /> }

export const SizesAndTones: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Progress size="sm" label="Small" value={30} />
      <Progress size="md" label="Medium" value={55} />
      <Progress size="lg" label="Large" value={80} />
      <Progress tone="success" label="Ingest complete" value={100} />
      <Progress tone="danger" label="Ingest stopped" value={67} valueText={() => 'Failed at 67%'} />
    </div>
  ),
}

export const Meters: Story = {
  render: () => (
    <div className="grid max-w-md gap-6">
      <Meter
        label="Tokens this month"
        value={31_200}
        max={64_000}
        valueText={(_, v) => `${v.toLocaleString('en-US')} / 64,000`}
      />
      <Meter
        label="Tokens this month"
        value={52_400}
        max={64_000}
        valueText={(_, v) => `${v.toLocaleString('en-US')} / 64,000`}
      />
      <Meter
        label="Tokens this month"
        value={61_900}
        max={64_000}
        valueText={(_, v) => `${v.toLocaleString('en-US')} / 64,000`}
      />
      <Meter label="Context window" value={0.38} max={1} format={{ style: 'percent' }} thresholds={{ warn: 0.8 }} size="sm" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The fill steps ink → gold → rojo as it crosses each threshold, and the thresholds are drawn on the track as ink ticks, so you can see the next step coming before the colour changes. The value text darkens with the fill — and the words, not just the hue, carry the reading.',
      },
    },
  },
}
