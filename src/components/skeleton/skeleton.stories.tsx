import type { Meta, StoryObj } from '@storybook/react-vite'

import { Skeleton, SkeletonText } from './skeleton'

const meta = {
  title: 'Components/Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Loading is a cut shape whose content has not arrived — it keeps the keyline and carries relleno. Without the texture the state ladder inverts: a hollow rectangle for *loading* next to a furnished placeholder for *empty* makes loading look emptier than empty. Hidden from assistive tech; the loading region says `aria-busy` once.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Block: Story = { args: { className: 'h-40 w-72' } }

export const Card: Story = {
  render: () => (
    <div role="status" aria-busy="true" aria-label="Loading agent" className="flex w-80 flex-col gap-4 bg-cloth-pale p-5 shadow-cut">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton shape="line" className="w-2/3" />
          <Skeleton shape="line" className="w-1/3" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  ),
}
