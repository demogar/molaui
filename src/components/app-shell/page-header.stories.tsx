import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pause, Pencil } from 'lucide-react'

import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Button } from '../button'
import { PageHeader } from './page-header'

const meta = {
  title: 'Components/Layout/Page header',
  component: PageHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Where am I, what is this, what can I do. Breadcrumbs sit above the title because they are navigation you can click back along — not an eyebrow pre-announcing the heading. Actions wrap below the title on a narrow screen rather than hiding in an overflow menu: the primary action of a page is the last thing that should cost an extra click.',
      },
    },
  },
  args: {
    title: 'Help panel for new workspaces',
    description: 'Does an in-app help panel in a workspace’s first week cut support tickets?',
    breadcrumb: (
      <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
        <a href="#rollouts" className="text-ink-2 underline decoration-keyline hover:text-ink">
          Rollouts
        </a>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span aria-current="page">RO-214</span>
      </nav>
    ),
    actions: (
      <>
        <Button variant="secondary" icon={<Pencil />}>
          Edit
        </Button>
        <Button variant="danger" icon={<Pause />}>
          Pause
        </Button>
      </>
    ),
    meta: [
      <Badge key="s" tone="info" dot pulse>
        Running
      </Badge>,
      <span key="o" className="flex items-center gap-1.5">
        <Avatar name="Kofi Mensah" size="xs" /> Kofi Mensah
      </span>,
      <span key="d" className="tabular-nums">
        Day 4 of 7
      </span>,
      <span key="a">10% of new workspaces</span>,
    ],
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Minimal: Story = {
  args: { breadcrumb: undefined, meta: undefined, actions: undefined, description: undefined, title: 'Settings' },
}
