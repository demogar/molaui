import type { Meta, StoryObj } from '@storybook/react-vite'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { ToastProvider } from '../../components/toast'
import { ApiKeysScreen } from './confirmation'

const meta = {
  title: 'Patterns/Confirmation',
  component: ApiKeysScreen,
  decorators: [
    (Story) => (
      <ToastProvider>
        <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar active="Settings" />}>
          <Story />
        </AppShell>
      </ToastProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '640px' },
      description: {
        component:
          'Revoking an API key: destructive, impossible to undo, a round trip to the server, and able to fail. Composed from `PageHeader`, `Breadcrumb`, `Table`, `Badge`, `Code`, `AlertDialog`, `Callout`, `EmptyState` and `Toast`, with nothing written for it. The settings page pattern shows a confirm that succeeds; this one is about the parts a happy-path confirm leaves out.\n\n**Decisions.** Every revoke asks first; a *live* key also asks for its name to be typed, because it is the one whose loss breaks a customer-facing service. A test key does not, since asking everyone to type for everything teaches people to type without reading. The question names the key and the description names what stops working. Cancel has focus when the dialog opens.\n\nWhile the request is in flight the confirm shows its working strip and neither button nor Escape answers. If it succeeds, the dialog closes and a toast says what happened. If it fails, the dialog stays open where the operator acted, says **Not revoked** with the reason, and the same button tries again. Afterwards focus returns to the row’s Revoke button, which stays, disabled but focusable, because revoked keys stay listed for 30 days and a removed button would drop focus to the top of the page.',
      },
    },
  },
} satisfies Meta<typeof ApiKeysScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ConfirmLiveKey: Story = {
  name: 'Confirm a live key',
  args: { defaultConfirmingId: 'key_widget' },
  parameters: {
    docs: {
      description: {
        story:
          'A live key asks for its name before Revoke key arms. Cancel has focus, so a reflexive Enter keeps the key.',
      },
    },
  },
}

export const RevokeFails: Story = {
  name: 'Revoke fails',
  args: {
    defaultConfirmingId: 'key_staging',
    defaultError: 'Cayuco didn’t answer within 10 seconds.',
    revoke: () => Promise.reject(new Error('Cayuco didn’t answer within 10 seconds.')),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The request failed. The dialog stays open, says the key was not revoked and still works, and Revoke key tries again. The failure is an alert inside the dialog’s description, because AlertDialog has no error slot of its own.',
      },
    },
  },
}

export const MemberView: Story = {
  name: 'No permission',
  args: { canRevoke: false },
  parameters: {
    docs: {
      description: {
        story:
          'A member, not an admin. The keys are visible, but there is no Revoke or Create to press and fail at: the callout names who can.',
      },
    },
  },
}

export const NoKeys: Story = {
  name: 'No keys',
  args: { keys: [] },
  parameters: {
    docs: {
      description: {
        story: 'Nothing to revoke. The empty state makes the case for one key per service, so one can go without the others.',
      },
    },
  },
}
