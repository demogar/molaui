import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { AgentHandoffScreen } from './agent-handoff'

const REFUND_ERROR = 'BillingUnavailable: upstream timed out after 10s (request req_9d02c4)'

const meta = {
  title: 'Patterns/Agent hand-off',
  component: AgentHandoffScreen,
  args: { onReassign: fn(), onSendReply: fn() },
  decorators: [
    (Story) => (
      <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar active="Escalations" />}>
        <Story />
      </AppShell>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '980px' },
      description: {
        component:
          'A Cayuco support agent has found a duplicate charge, drafted the refund and the reply, and stopped: the refund is over what it may do alone. Composed from the AI layer (`Message`, `Confidence`, `ToolCall` with `approval`, `RunStatus`, `AgentRun`) and the core (`PageHeader`, `Breadcrumb`, `Badge`, `Callout`, `Field`, `Textarea`, `EmptyState`), with nothing written for it.\n\n**Decisions.** The decision comes first: what the agent needs, in its own words in Alegreya, with its confidence as a level and a basis, then the exact call it wants to make, in Martian Mono, with **Approve refund** and **Deny** of equal weight. The run that led here sits beside it as a timeline, so the work can be checked without leaving the decision. **Take over** is always in the header while the hand-off is open: it stops the agent and gives the person the draft to edit and send as themselves. Deny is a take-over too, because the agent has nothing left to do once its plan is refused. Nothing reaches the customer until a person has decided.\n\nSomeone who may not approve a refund this size still sees the proposal, without an Approve that would fail after they decided; the callout names who can and offers to reassign. Approving, denying and taking over each remove the pressed button, so focus moves to the hand-off’s heading, which now says what happened, and the later outcome is announced politely when it lands.',
      },
    },
  },
} satisfies Meta<typeof AgentHandoffScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Waiting for approval',
}

export const NoPermission: Story = {
  name: 'No permission',
  args: { canApprove: false },
  parameters: {
    docs: {
      description: {
        story:
          'A support operator, not a billing lead. The proposal is visible but has no Approve; the callout names who can approve and offers to reassign, and Take over stays.',
      },
    },
  },
}

export const RefundFails: Story = {
  name: 'Refund fails',
  args: {
    defaultOutcome: 'refund-failed',
    defaultRefundError: REFUND_ERROR,
    // The story opens on the failure; Retry call then succeeds, as it usually does after a timeout.
    refund: () => new Promise((resolve) => window.setTimeout(resolve, 1_200)),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Approved, and the billing service timed out. The failed call says so verbatim with Retry call, nothing was sent to the customer, and Take over is still there.',
      },
    },
  },
}

export const Approved: Story = {
  args: { defaultOutcome: 'refunded' },
  parameters: {
    docs: {
      description: {
        story: 'Approved and done: the refund ran, the reply went, and the run says who approved it.',
      },
    },
  },
}

export const TakenOver: Story = {
  name: 'Taken over',
  args: { defaultOutcome: 'taken-over' },
  parameters: {
    docs: {
      description: {
        story:
          'The person took the ticket. The agent stopped without sending anything, and its draft is now the starting point of a reply the person sends as themselves.',
      },
    },
  },
}

export const NothingWaiting: Story = {
  name: 'Nothing waiting',
  args: { handoff: null },
  parameters: {
    docs: {
      description: {
        story: 'No hand-offs. The empty state says what will appear here, and when.',
      },
    },
  },
}
