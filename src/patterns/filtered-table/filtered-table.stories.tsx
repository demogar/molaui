import type { Meta, StoryObj } from '@storybook/react-vite'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { RunsAdminScreen } from './filtered-table'

const meta = {
  title: 'Patterns/Filtered table',
  component: RunsAdminScreen,
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
  render: () => (
    <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar />}>
      <RunsAdminScreen />
    </AppShell>
  ),
}
