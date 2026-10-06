import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../button'
import { ToastProvider, useToast } from './toast'

const meta = {
  title: 'Components/Feedback/Toast',
  component: ToastProvider,
  args: { children: null },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      story: { inline: false, height: '420px' },
      description: {
        component:
          'Something happened somewhere other than where the operator is looking. Tone is a single cut square of the layer colour beside the title — four toasts in four washes is a fruit bowl, four cloth cards with four marks is a list. **`toast.running()`** is the case an AI platform has and a generic library does not: a toast with no timeout and a working relleno strip, which `toast.update(id, …)` turns into the result *in place*, so the outcome lands where the operator last saw the work.',
      },
    },
  },
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

function Tones() {
  const toast = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => toast.show({ title: 'Draft saved', description: 'Experiment “Streak nudge v3”.' })}>
        Neutral
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.success({
            title: 'Experiment launched',
            description: 'Rolling out to 5% of eligible players.',
            action: { label: 'View', onClick: () => {} },
          })
        }
      >
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast.info({ title: 'New model available', description: 'Switch in agent settings.' })}>
        Info
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error({ title: 'Deploy failed', description: 'Tool “search_games” timed out after 30s.', action: { label: 'Retry', onClick: () => {} } })
        }
      >
        Danger
      </Button>
    </div>
  )
}

export const AllTones: Story = { render: () => <Tones /> }

function LongRunning() {
  const toast = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => {
          const id = toast.running({ title: 'Re-indexing 1,204 documents', description: 'You can leave this page.' })
          setTimeout(() => toast.update(id, { tone: 'success', title: 'Index rebuilt', description: '1,204 documents · 3m 41s' }), 3500)
        }}
      >
        Start re-index
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          const id = toast.running({ title: 'Evaluating 300 prompts' })
          setTimeout(
            () =>
              toast.update(id, {
                tone: 'danger',
                title: 'Evaluation stopped at 212 / 300',
                description: 'Rate limited by the model provider.',
                action: { label: 'Resume', onClick: () => {} },
              }),
            3000,
          )
        }}
      >
        Start eval (fails)
      </Button>
    </div>
  )
}

export const RunningToResult: Story = {
  render: () => <LongRunning />,
  parameters: {
    docs: {
      description: {
        story:
          'The running toast does not time out and carries the working relleno along its foot. When the work ends, the same card is re-toned and re-worded, and only then starts its dismiss timer.',
      },
    },
  },
}

function Stack() {
  const toast = useToast()
  return (
    <Button
      variant="secondary"
      onClick={() => {
        toast.success({ title: 'Run #4182 completed' })
        setTimeout(() => toast.info({ title: 'Run #4183 queued' }), 250)
        setTimeout(() => toast.error({ title: 'Run #4184 failed', description: 'Step 3 · fetch_pgn returned 502' }), 500)
      }}
    >
      Fire three
    </Button>
  )
}

export const Stacking: Story = {
  render: () => <Stack />,
  parameters: {
    docs: {
      description: {
        story: 'The stack peeks and shrinks; hover or focus fans it out. Swipe right or down to dismiss. F6 moves focus into the toast region.',
      },
    },
  },
}
