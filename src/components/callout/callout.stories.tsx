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
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warn', 'danger'] } },
  parameters: {
    docs: {
      description: {
        component:
          'A message that belongs to a region of the page rather than to a moment. Tone is carried by a **relleno seam** along the top — the layer colour as a field, slit with ink — instead of the thick left border every admin template wears. Below it, the layer’s wash, mixed at the percentage that keeps the whole ink ramp legal. The icon takes colour; the words never do.',
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
