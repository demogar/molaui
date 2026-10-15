import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { RUNS, RunsAdminScreen } from './filtered-table'

const meta = {
  title: 'Patterns/Filtered table',
  component: RunsAdminScreen,
  args: { onRetry: fn() },
  decorators: [
    (Story) => (
      <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar />}>
        <Story />
      </AppShell>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '900px' },
      description: {
        component:
          'A whole Cayuco admin screen, composed from the system with nothing written for it: the app shell, a search field, an agent `Combobox`, a `DateRangePicker` with presets, a `Toolbar` of status toggles, and a `DataTable` with selection, a bulk-action bar, a Columns menu and pages. Choosing a run opens it in a `Drawer`.\n\n**Decisions.** The filters sit on one cut panel with the status toolbar, because they are one question asked of the data; the table’s own bar under it only ever describes the answer (how many runs, or what is selected). Every filter has a visible label — a placeholder is a hint and disappears as soon as someone types. The status toggles carry their counts, computed under the other filters, so “Failed 4” is what clicking it will show. A filter that matches nothing gives the *no results* empty state with **Clear filters**; it never says “create your first run”. Changing a filter clears the selection, and cancelling selected runs changes the data in place and clears it too, so the bar never offers an action on rows that are hidden or no longer qualify.',
      },
    },
  },
} satisfies Meta<typeof RunsAdminScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Runs: Story = {
  name: 'Runs admin screen',
}

export const NoResults: Story = {
  name: 'No results',
  args: { defaultQuery: 'refund-bot' },
  parameters: {
    docs: {
      description: {
        story:
          'The filters match nothing. The *no results* empty state sits inside the table, under its headers, and offers **Clear filters**. It never offers to create a first run: runs exist, the question hides them.',
      },
    },
  },
}

export const Loading: Story = {
  args: { status: 'loading' },
  parameters: {
    docs: {
      description: {
        story:
          'The first rows have not arrived. The filters stay, because the question is still right; the toggles drop their counts, because a count of runs not yet loaded would be wrong; the table keeps its headers over skeleton rows and its bar says “Loading…”.',
      },
    },
  },
}

export const LoadError: Story = {
  name: 'Load error',
  args: { status: 'error' },
  parameters: {
    docs: {
      description: {
        story:
          'The runs could not be loaded. An error empty state with **Retry** takes the table’s place, saying what is still true; a table of zero rows would have said “0 runs”, which is a different claim. The filters are kept for the retry.',
      },
    },
  },
}

export const NoPermission: Story = {
  name: 'No permission',
  args: { canManage: false, defaultSelection: RUNS.slice(1, 3).map((run) => run.id) },
  parameters: {
    docs: {
      description: {
        story:
          'A viewer, with two running runs selected. The bulk bar offers Re-run and Export but no Cancel to press and fail at, New run is gone from the header, and the callout names who can cancel.',
      },
    },
  },
}
