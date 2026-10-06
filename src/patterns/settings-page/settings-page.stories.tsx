import type { Meta, StoryObj } from '@storybook/react-vite'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { ToastProvider } from '../../components/toast'
import { SettingsPage } from './settings-page'

const meta = {
  title: 'Patterns/Settings page',
  component: SettingsPage,
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
      story: { inline: false, height: '900px' },
      description: {
        component:
          'The settings of a Cayuco workspace: General, Models and limits, Notifications, and a danger zone. Composed from `PageHeader`, `NavItem`, `Field`, `Input`, `Textarea`, `Select`, `NumberInput`, `RadioGroup`, `Switch`, `AlertDialog` and `Toast`, with nothing written for it.\n\n**Decisions.** Settings save together, with one button: a spend limit and the rule for what happens when it is reached are one decision, and saving them one control at a time would run the workspace on half of it. A sticky bar at the foot of the form counts the changes in words — *3 unsaved changes* — and is always there, quiet when there is nothing to save; a bar that vanished on save would take the focused button with it. Save confirms with a toast, and Discard offers **Undo** in one, so neither needs a dialog.\n\nErrors appear when Save is pressed, not while someone is still typing; each says what is wrong and how to fix it, focus goes to the first, and each clears as soon as its field is fixed. While the form is dirty, any link that leaves the page — the sidebar, the settings pages, the breadcrumb — asks **Discard unsaved changes?** first, with *Keep editing* focused and *Discard* as the destructive answer.\n\nThe danger zone sits after the form, not in it: deleting the workspace is immediate, so Save can never delete anything and Discard can never bring it back. Its confirm names the workspace and everything that goes with it, and asks for the slug to be typed.',
      },
    },
  },
} satisfies Meta<typeof SettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Dirty: Story = {
  args: { defaultDraft: { defaultModel: 'cayuco-deep-3', monthlyLimit: 3000, weeklyDigest: false } },
  parameters: {
    docs: {
      description: {
        story:
          'Three settings changed and not yet saved. The bar counts them and arms Save and Discard; following any link out of the page now asks first.',
      },
    },
  },
}

export const WithValidationErrors: Story = {
  name: 'With validation errors',
  args: { defaultDraft: { name: '', slug: 'Growth Team', tokensPerRun: 250000 }, defaultValidated: true },
  parameters: {
    docs: {
      description: {
        story:
          'Save pressed with three problems. Each message says what is wrong and what to do; focus is on the first invalid field, and the bar says how many need fixing instead of how many changed.',
      },
    },
  },
}
