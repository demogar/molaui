import type { Meta, StoryObj } from '@storybook/react-vite'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { AgentsScreen } from './list-and-detail'

const meta = {
  title: 'Patterns/List and detail',
  component: AgentsScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '820px' },
      description: {
        component:
          'The Cayuco agents screen: every agent in the workspace on the start side, the chosen one on the end side. Composed from `PageHeader`, `Badge`, `Callout`, `StatGroup`, `DescriptionList`, `Table` and `EmptyState`, with nothing written for it.\n\n**Decisions.** The split is a *container* query, not a viewport breakpoint: it needs about 48rem of its own width, and the content area’s width depends on whether the sidebar is open, collapsed to its rail, or not there at all. Narrower than that, the screen shows one pane at a time — choosing an agent replaces the list with its detail, focus moves to the detail’s heading, and a visible **Back to agents** returns to the list with focus on the agent you came from. The browser’s back gesture was not enough on its own: it is invisible, and in an embedded tool it can leave the product.\n\nEach agent is a button marked `aria-current` when it is the one shown. A listbox was rejected: its options cannot carry a badge and a second line that a screen reader reads properly, and choosing an agent is navigation (a route, in a product), which is what `aria-current` says. The open agent wears the sidebar’s current-page cues — an ink bar on the leading edge, a washed ground, a heavier name — and every state is a dot, a word and a tone. The agent’s purpose is set in Alegreya because a person wrote it; the model, tools and ids are in Martian Mono because they are machine literals.',
      },
    },
  },
} satisfies Meta<typeof AgentsScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar active="Agents" />}>
      <AgentsScreen {...args} />
    </AppShell>
  ),
}

/**
 * The content area forced to phone width with a container, so the
 * one-column layout shows at any viewport — in the docs iframe, in the unit
 * suite and in screenshots alike. That works only because the split is a
 * container query; a viewport breakpoint would show two panes here.
 */
export const Narrow: Story = {
  args: { defaultSelectedId: 'agt_support-triage', defaultView: 'detail' },
  render: (args) => (
    <div className="flex h-dvh justify-center bg-cloth-shade">
      <main className="h-full w-full max-w-[390px] overflow-y-auto bg-cloth shadow-cut scroll-cloth">
        <AgentsScreen {...args} />
      </main>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'One column, opened on an agent. **Back to agents** returns to the list and puts focus back on the agent you came from. The frame is 390px wide whatever the viewport, which is only possible because the split responds to its container.',
      },
    },
  },
}

export const Empty: Story = {
  args: { agents: [] },
  render: (args) => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar active="Agents" />}>
      <AgentsScreen {...args} />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A workspace with no agents yet. There is nothing to split, so the screen is the empty state alone, and its one action creates the first agent — the *empty* variant, never *no results*, because nothing is being filtered out.',
      },
    },
  },
}
