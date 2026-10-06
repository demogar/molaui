import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { RUN_STATUS_LABEL, RunStatus, type RunStatusValue } from './run-status'

const STATUSES = Object.keys(RUN_STATUS_LABEL) as RunStatusValue[]

const meta = {
  title: 'AI/Run status',
  component: RunStatus,
  args: { status: 'running' },
  argTypes: { status: { control: 'select', options: STATUSES } },
  parameters: {
    docs: {
      description: {
        component: [
          'One vocabulary for every unit of model work — a run, a step, a tool call — so "Needs approval" on a tool call and on the run that holds it are the same mark and the same word.',
          '',
          '**Glyph + word + colour, always all three.** Each status differs in *shape* as well as hue, so the set survives greyscale, colour-blindness and a screenshot pasted into a monochrome ticket.',
          '',
          '**Latency is a clock, never a percentage.** A model call has no knowable total; elapsed time is the one honest number, and the one an operator needs to decide whether to wait or cancel. It is set in tabular figures and zero-padded so it ticks in place.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof RunStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllStatuses: Story = {
  render: () => (
    <div className="max-w-full overflow-x-auto">
      <table className="border-collapse text-start">
        <thead>
          <tr className="border-b border-ink">
            <th className="rotulo py-2 pe-8 font-semibold text-ink-2">Status</th>
            <th className="rotulo py-2 pe-8 font-semibold text-ink-2">Label register</th>
            <th className="rotulo py-2 font-semibold text-ink-2">Inline register</th>
          </tr>
        </thead>
        <tbody>
          {STATUSES.map((status) => (
            <tr key={status} className="border-b border-keyline">
              <td className="py-2.5 pe-8">
                <code className="literal text-ink-2">{status}</code>
              </td>
              <td className="py-2.5 pe-8">
                <RunStatus status={status} />
              </td>
              <td className="py-2.5">
                <RunStatus status={status} register="inline" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}

function LiveClock() {
  const [startedAt] = React.useState(() => Date.now() - 2_300)
  return (
    <div className="flex flex-col items-start gap-3">
      <RunStatus status="running" startedAt={startedAt} />
      <RunStatus status="streaming" startedAt={startedAt - 61_000} register="inline" />
      <RunStatus status="succeeded" durationMs={4_820} register="inline" />
      <RunStatus status="timed_out" durationMs={300_000} register="inline" />
    </div>
  )
}

export const WithElapsedTime: Story = {
  render: () => <LiveClock />,
  parameters: {
    docs: {
      description: {
        story:
          'Open work ticks every 100ms; finished work shows a fixed duration. One decimal under a minute, where tenths change a decision; whole units above it.',
      },
    },
  },
}
