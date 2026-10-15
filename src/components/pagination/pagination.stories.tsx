import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ComponentProps, useState } from 'react'

import { Pagination } from './pagination'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'

const meta = {
  title: 'Components/Navigation/Pagination',
  tags: ['stable'],
  component: Pagination,
  args: { page: 5, pageCount: 26, onPageChange: () => {} },
  parameters: {
    docs: {
      description: {
        component:
          '**Pages** for results where the page is a place people come back to; **compact** — “51–100 of 1,284” — for dense tables where the question is how much is left. The range always has the same number of slots, so the control never changes width as you page and the next-arrow never moves out from under the pointer.',
      },
    },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

function Stateful(props: Partial<ComponentProps<typeof Pagination>>) {
  const [page, setPage] = useState(props.page ?? 1)
  return <Pagination pageCount={26} {...props} page={page} onPageChange={setPage} />
}

export const Pages: Story = { render: () => <Stateful page={5} /> }

export const NearTheEdges: Story = {
  render: () => (
    <div className="grid gap-4">
      <Stateful page={1} aria-label="Pagination, first page" />
      <Stateful page={26} aria-label="Pagination, last page" />
      <Stateful page={3} pageCount={7} aria-label="Pagination, seven pages" />
    </div>
  ),
}

export const Compact: Story = {
  render: () => <Stateful variant="compact" page={2} pageCount={26} pageSize={50} total={1284} />,
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Stateful page={12480} pageCount={48213} aria-label="Pagination, five-digit pages" />
        <Stateful variant="compact" page={2497} pageCount={9643} pageSize={50} total={482139} aria-label="Pagination, large total" />
      </HardState>
      <HardState state="rtl">
        <Stateful page={5} aria-label="ترقيم الصفحات" />
        <Stateful variant="compact" page={2} pageSize={50} total={1284} aria-label="ترقيم الصفحات المختصر" />
      </HardState>
      <HardState state="disabled">
        <Stateful page={1} pageCount={4} aria-label="Pagination, on the first page" />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Five-digit page numbers keep the range to the same slots and wrap rather than push the next arrow off a phone; in right to left the arrows point the other way and the compact range keeps its own order; on the first page Previous is disabled, stated, and stays in place so the row never shifts. Pagination has no error state: a page that fails to load is the table’s error, not the control’s.',
      },
    },
  },
}
