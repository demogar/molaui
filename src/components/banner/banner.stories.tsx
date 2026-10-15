import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { Banner } from './banner'

const meta = {
  title: 'Components/Feedback/Banner',
  tags: ['experimental'],
  component: Banner,
  args: {
    tone: 'warn',
    title: 'Scheduled maintenance',
    children: 'Saturday 18 October, 02:00–03:00 UTC. Runs started in that window wait in the queue and start when it ends.',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warn', 'danger'] },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A condition of the **whole application**, said once across the top of it, for as long as it holds: maintenance tonight, a read-only workspace, a dropped connection. Full bleed in the AppShell’s `banner` slot, above the top bar, so it pushes the frame down instead of covering the search. The tone is the wash and a `--bar-w` foot in the status colour, the edge whose one job is “the region a status owns”. It is a landmark named Announcement, read in order after the skip link; only a banner that appears mid-session asks to be announced, once and politely, with `announce`.',
      },
    },
  },
} satisfies Meta<typeof Banner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Tones: Story = {
  render: () => (
    <div className="grid gap-4">
      <Banner tone="neutral" label="Workspace mode" title="Read-only workspace">
        You can view runs and traces. Ask a Support owner for edit access.
      </Banner>
      <Banner tone="info" label="Release note" title="Tool-call replay is here">
        Re-run one tool call with edited arguments from any trace.
      </Banner>
      <Banner tone="success" label="Connection" title="Back online">
        Runs that queued while you were offline have started.
      </Banner>
      <Banner tone="warn" label="Maintenance" title="Scheduled maintenance">
        Saturday 18 October, 02:00–03:00 UTC.
      </Banner>
      <Banner tone="danger" label="Billing" title="Payment failed">
        Agents stop taking new runs on 21 October unless the card on file is updated.
      </Banner>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'One per page in practice; stacked here only to compare. Each has its own `label` because a page with two banners has two landmarks, and two called “Announcement” cannot be told apart in a landmark list. Rojo is held to `danger` (ADR 0008): a failed payment that will stop agents, not news.',
      },
    },
  },
}

export const WithAction: Story = {
  args: {
    tone: 'danger',
    title: 'Payment failed',
    children: 'Agents stop taking new runs on 21 October unless the card on file is updated.',
    action: (
      <Button variant="secondary" size="sm">
        Update card
      </Button>
    ),
    onDismiss: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'One action, a verb on the object, and a Dismiss the caller owns: dismissing hides this banner, it does not fix the card, so a page that brings it back tomorrow is right to.',
      },
    },
  },
}

function Connection() {
  const [online, setOnline] = React.useState(true)
  return (
    <div className="grid gap-4">
      {online ? null : (
        <Banner tone="danger" label="Connection" title="Connection lost" announce>
          Changes are kept on this device and sent when the connection returns.
        </Banner>
      )}
      <div className="px-4">
        <Button variant="secondary" onClick={() => setOnline((o) => !o)}>
          {online ? 'Drop the connection' : 'Restore the connection'}
        </Button>
      </div>
    </div>
  )
}

export const Announced: Story = {
  render: () => <Connection />,
  parameters: {
    docs: {
      description: {
        story:
          'A banner that appears because something changed during the session passes `announce`: the message is said once, politely, from a status region that mounts empty and is filled a moment later. Never assertive, and never for a banner that is there when the page loads, which is read in order like the rest of the page.',
      },
    },
  },
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame className="p-4">
      <HardState state="long-label">
        <Banner
          tone="warn"
          label="Maintenance, long"
          title="Scheduled maintenance of the run queue and the knowledge index"
          action={<Button size="sm" variant="secondary">View the status page</Button>}
          onDismiss={fn()}
        >
          Saturday 18 October, 02:00–03:00 UTC. Runs started in that window wait in the queue and start when it ends; answers cite the previous index until then.
        </Banner>
      </HardState>
      <HardState state="rtl">
        <Banner tone="info" label="إعلان" title="إعادة تشغيل الأدوات متاحة" onDismiss={fn()}>
          أعد تشغيل أي استدعاء أداة بمعاملات معدّلة من صفحة التتبع.
        </Banner>
      </HardState>
      <HardState state="error">
        <Banner tone="danger" label="Billing" title="Payment failed">
          Agents stop taking new runs on 21 October unless the card on file is updated.
        </Banner>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long title and message wrap under the icon, and the action and Dismiss wrap to their own line rather than squeezing the message; in right to left the icon, the message and Dismiss change sides. The error is the danger tone: glyph, “Error:” and the colour. A banner has no disabled state of its own: its action is a Button with one.',
      },
    },
  },
}
