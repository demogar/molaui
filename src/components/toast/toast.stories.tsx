import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'

import { Button } from '../button'
import { ToastProvider, useToast } from './toast'

const meta = {
  title: 'Components/Feedback/Toast',
  tags: ['stable'],
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
      <Button variant="secondary" onClick={() => toast.show({ title: 'Draft saved', description: 'Saved reply “Refund window v3”.' })}>
        Neutral
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.success({
            title: 'Rollout started',
            description: 'Showing the help panel to 5% of new workspaces.',
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
          toast.error({ title: 'Deploy failed', description: 'Tool “search_tickets” timed out after 30s.', action: { label: 'Retry', onClick: () => {} } })
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

const LONG_TOAST = {
  title: 'Re-indexing finished for the Starter plan help panel knowledge base and every linked policy document',
  description: '1,204 documents in 3m 41s. Answers cite the new versions from now on, and the previous index is kept for seven days.',
  action: { label: 'Open index', onClick: () => {} },
}

function HardStatesToasts() {
  const toast = useToast()
  // The long toast is on screen when the story opens, and stays (timeout 0),
  // so the long-label state is in the picture rather than behind a click.
  // `useToast` returns a new object each render, so the effect is guarded
  // by a ref rather than keyed on it, which re-raised the toast forever.
  const raised = React.useRef(false)
  React.useEffect(() => {
    if (raised.current) return
    raised.current = true
    toast.success({ ...LONG_TOAST, timeout: 0, id: 'toast-hard-long' })
  }, [toast])
  return (
    <HardStatesFrame>
      <HardState state="long-label">
        <div>
          <Button variant="secondary" onClick={() => toast.success(LONG_TOAST)}>
            Show the long toast
          </Button>
        </div>
      </HardState>
      <HardState state="rtl">
        <div>
          <Button variant="secondary" onClick={() => toast.info({ title: 'نموذج جديد متاح', description: 'غيّره من إعدادات الوكيل.' })}>
            إظهار الإشعار
          </Button>
        </div>
      </HardState>
      <HardState state="error">
        <div>
          <Button
            variant="secondary"
            onClick={() =>
              toast.error({ title: 'Deploy failed', description: 'Tool “search_tickets” timed out after 30s.', action: { label: 'Retry', onClick: () => {} } })
            }
          >
            Show the failure
          </Button>
        </div>
      </HardState>
    </HardStatesFrame>
  )
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => <HardStatesToasts />,
  parameters: {
    docs: {
      description: {
        story:
          'Toasts live in one region at the page’s inline end, not inside a cell, so each cell holds the button that raises its toast, and the long one is already showing: a long title and description wrap inside the card’s 24rem, never past a phone’s edge. The Arabic toast follows the page’s direction, so the whole stack moves to the left edge on a right-to-left page; the error is the danger tone, mark and “Error:” as well as the colour. A toast has no disabled state: a notice that cannot be acted on is not raised.',
      },
    },
  },
}
