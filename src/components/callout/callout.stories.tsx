import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { Callout } from './callout'

const meta = {
  title: 'Components/Feedback/Callout',
  component: Callout,
  args: {
    tone: 'info',
    title: 'This agent uses a model that retires on 1 December',
    children: 'Runs keep working until then. Switch the model in settings to keep evaluation history comparable.',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warn', 'danger'] },
    variant: { control: 'inline-radio', options: ['seam', 'flat'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A message that belongs to a region of the page rather than to a moment. Tone is carried by a **relleno seam** along the top — the layer colour as a field, slit with ink — instead of the thick left border every admin template wears. Below it, the layer’s wash, mixed at the percentage that keeps the whole ink ramp legal. The icon takes colour; the words never do. For a short aside beside a hero or at the head of a list, `variant="flat"` drops the seam, the keyline and the icon for the wash and a square Swatch, and never stretches to the height of its row.',
      },
    },
  },
} satisfies Meta<typeof Callout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Tones: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-4">
      <Callout tone="neutral" title="Read-only workspace">
        You can view runs and traces. Ask an owner for edit access.
      </Callout>
      <Callout tone="info" title="New: tool-call replay">
        Re-run a single tool call with edited arguments from the trace view.
      </Callout>
      <Callout tone="success" title="Evaluation passed">
        298 of 300 prompts matched the reference answer.
      </Callout>
      <Callout tone="warn" title="Token budget at 86%">
        At the current rate this workspace reaches its monthly limit on 24 October.
      </Callout>
      <Callout tone="danger" title="Knowledge index is stale">
        The last ingest failed 3 hours ago. Answers may cite documents that have since changed.
      </Callout>
    </div>
  ),
}

export const WithActions: Story = {
  args: {
    tone: 'danger',
    title: 'Ingest failed at document 812 of 1,204',
    children: 'The source returned 403 for /policies/fair-play.md. Earlier documents were indexed.',
    actions: (
      <>
        <Button size="sm" variant="secondary">
          Retry from 812
        </Button>
        <Button size="sm" variant="ghost">
          View log
        </Button>
      </>
    ),
    onDismiss: fn(),
  },
}

export const BodyOnly: Story = {
  args: { title: undefined, tone: 'neutral', children: 'Costs are estimates until the provider’s invoice closes, usually on the 3rd.' },
}

export const Flat: Story = {
  args: {
    variant: 'flat',
    tone: 'warn',
    title: 'Nobody at Cayuco will ask you for money',
    children: 'If someone asks for a transfer in Cayuco’s name, report it from their profile.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The wash and a square swatch in the tone, nothing else: no seam, no keyline, no icon. It is still a region named by its title, and `headingLevel` still sets the heading.',
      },
    },
  },
}

export const FlatTones: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-3">
      <Callout variant="flat" tone="neutral" title="Read-only workspace">
        You can view runs and traces. Ask an owner for edit access.
      </Callout>
      <Callout variant="flat" tone="info" title="New: tool-call replay">
        Re-run a single tool call with edited arguments from the trace view.
      </Callout>
      <Callout variant="flat" tone="success" title="Evaluation passed">
        298 of 300 prompts matched the reference answer.
      </Callout>
      <Callout variant="flat" tone="warn" title="Token budget at 86%">
        At the current rate this workspace reaches its monthly limit on 24 October.
      </Callout>
      <Callout variant="flat" tone="danger" title="Knowledge index is stale">
        The last ingest failed 3 hours ago. Answers may cite documents that have since changed.
      </Callout>
      <Callout variant="flat" tone="neutral">
        Costs are estimates until the provider’s invoice closes, usually on the 3rd.
      </Callout>
    </div>
  ),
}

export const FlatInAGrid: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Beside a taller column the flat callout keeps its own height (`h-fit`) instead of stretching into a tinted slab. `self-start` was not used because in a flex column it would also shrink the width.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-3xl gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="grid gap-3">
        <h2 className="m-0 font-ui text-2xl font-semibold text-ink">Collection points near you</h2>
        <p className="m-0 text-sm leading-body text-ink-2">
          Every point on Cayuco publishes what it needs and when it is open. Urgent needs come first, then the
          points confirmed most recently. Call ahead before you go: needs change by the hour.
        </p>
        <p className="m-0 text-sm leading-body text-ink-2">
          Points that close or stop answering are hidden until someone confirms them again.
        </p>
      </div>
      <Callout variant="flat" tone="warn" title="Nobody here will ask for money" headingLevel={2}>
        Report a transfer request from the point’s page.
      </Callout>
    </div>
  ),
}
