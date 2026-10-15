import type { Meta, StoryObj } from '@storybook/react-vite'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { AgentFormScreen } from './form-validation'

const meta = {
  title: 'Patterns/Form validation',
  component: AgentFormScreen,
  decorators: [
    (Story) => (
      <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar active="Agents" />}>
        <Story />
      </AppShell>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '1400px' },
      description: {
        component:
          'A Cayuco agent’s configuration: every kind of form control, composed into the form an AI platform team edits daily, with nothing written for it. Submit it empty to see validation.\n\n**Decisions.** Nothing is flagged while someone is still filling it in. Submitting validates every field at once: a **`FormErrorSummary`** at the top lists the problems as links to their fields and **takes focus**. That focus move is the one announcement; inside a `Form` with a summary, each field’s error is part of its control’s description rather than its own alert, so six problems are not six alerts fired in one tick. Every control sits in a `Field`, so label, hint and error are wired for it, and *required* is a word beside the label.\n\nWhile the configuration loads, the fields are skeletons in their columns and Save waits. Someone who may not change the agent reads the saved values as text, with who can change them, rather than a form of disabled controls that looks editable and only refuses on Save.',
      },
    },
  },
} satisfies Meta<typeof AgentFormScreen>

export default meta
type Story = StoryObj<typeof meta>

export const AgentConfiguration: Story = {
  name: 'Agent configuration',
  parameters: {
    docs: {
      description: {
        story: 'A new configuration: every required field empty, and nothing flagged until Save is pressed.',
      },
    },
  },
}

export const WithErrors: Story = {
  name: 'With errors',
  args: { defaultValidated: true },
  parameters: {
    docs: {
      description: {
        story:
          'Save pressed with the form empty. The summary at the top lists the six problems as links and has focus; each invalid control says what is wrong and what to do.',
      },
    },
  },
}

export const Loading: Story = {
  args: { loading: true },
  parameters: {
    docs: {
      description: {
        story:
          'The configuration has not arrived. The card keeps its header, the fields are skeletons in their columns, and one polite status says “Loading the configuration”. No Save until there are values to save.',
      },
    },
  },
}

export const ReadOnly: Story = {
  name: 'No permission',
  args: { canEdit: false },
  parameters: {
    docs: {
      description: {
        story:
          'Someone who is not an owner of the agent. The saved configuration is stated as text, with a callout naming who can change it; no form of disabled controls, and no Save to refuse.',
      },
    },
  },
}
