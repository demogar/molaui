import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { CayucoSidebar, CayucoTopbar } from '../../components/app-shell/_story-data/cayuco-chrome'
import { AppShell } from '../../components/app-shell/app-shell'
import { SourcesScreen, type SourcesStatus } from './empty-states'

const meta = {
  title: 'Patterns/Empty states',
  component: SourcesScreen,
  args: { onConnect: fn(), onRetry: fn(), onRequestAccess: fn() },
  decorators: [
    (Story) => (
      <AppShell topbar={<CayucoTopbar />} sidebar={<CayucoSidebar active="Knowledge" />}>
        <Story />
      </AppShell>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '640px' },
      description: {
        component:
          'The knowledge sources of a Cayuco workspace: a header, a search field and a table. Composed from `PageHeader`, `Breadcrumb`, `Field`, `SearchInput`, `Table` and `EmptyState`, with nothing written for it. The screen is ordinary on purpose; what it demonstrates is every condition in which there is no list to show.\n\n**Decisions.** *First run* takes the whole body and its action connects the first source; the search field is not drawn, because a search over nothing can only fail. *No results* keeps the count and the search field, puts the empty state in the table’s place and offers **Show all sources**, which clears the search and returns focus to the field. (Not “Clear search”: the field’s own clear button already has that name, and two controls with one name are one too many to a screen reader.) It never says “connect your first source” to someone who has five. *Error* says what is still true (the sources are still connected) and offers **Retry**; once the rows are back, focus moves to their heading. *No permission* names the two people who can grant access, and the header drops **Connect source**, because offering an action the reader cannot take is a second refusal. *Loading* is the table’s own shape with skeleton rows, `aria-busy`, and one polite “Loading knowledge sources”.',
      },
    },
  },
} satisfies Meta<typeof SourcesScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const FirstRun: Story = {
  name: 'First run',
  args: { sources: [] },
  parameters: {
    docs: {
      description: {
        story:
          'Nothing connected yet. The empty state is the whole body, with the action that creates the first source and a way to read how sources work. Connect stays in the header too, where it will be once there is a list.',
      },
    },
  },
}

export const NoResults: Story = {
  name: 'No results',
  args: { defaultQuery: 'onboarding' },
  parameters: {
    docs: {
      description: {
        story:
          'Five sources, none matching. The count and the search stay, so the list is visibly still there; the empty state in the table’s place shows every source again and puts focus back in the field.',
      },
    },
  },
}

export const Loading: Story = {
  args: { status: 'loading' },
  parameters: {
    docs: {
      description: {
        story: 'The table’s real headers over skeleton rows, marked busy, with one polite status for screen readers.',
      },
    },
  },
}

/** Retry goes through loading back to the list, as it would against a slow service. */
function RetryingScreen(props: React.ComponentProps<typeof SourcesScreen>) {
  const [status, setStatus] = React.useState<SourcesStatus>('error')
  return (
    <SourcesScreen
      {...props}
      status={status}
      onRetry={() => {
        props.onRetry?.()
        setStatus('loading')
        window.setTimeout(() => setStatus('ready'), 900)
      }}
    />
  )
}

export const LoadError: Story = {
  name: 'Load error',
  render: (args) => <RetryingScreen {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'The list did not load. The error is an alert, says what has not changed, and offers Retry; press it to go through loading and back to the list, with focus on its heading.',
      },
    },
  },
}

export const NoPermission: Story = {
  name: 'No permission',
  args: { status: 'no-permission' },
  parameters: {
    docs: {
      description: {
        story:
          'The list exists and is not yours to see. It names who can grant access and drops Connect source from the header, since the reader could not use it.',
      },
    },
  },
}
