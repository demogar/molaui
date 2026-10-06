import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Button } from '../button'
import { Skeleton, SkeletonGroup, SkeletonText } from './skeleton'

const meta = {
  title: 'Components/Feedback/Skeleton',
  component: Skeleton,
  argTypes: {
    shape: { control: 'inline-radio', options: ['block', 'text', 'avatar'] },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Loading is a cut shape whose content has not arrived — it keeps the keyline and carries relleno. Without the texture the state ladder inverts: a hollow rectangle for *loading* next to a furnished placeholder for *empty* makes loading look emptier than empty.\n\nThree shapes: **block** (a card, chart or image), **text** (sized in `em`, so it follows the type around it) and **avatar** (the same square steps as `Avatar`). A band of raised cloth sweeps over every bone in reading order, mirrored in right-to-left; it replaced an opacity pulse, which faded the keyline with the fill. Under **reduced motion** the sweep is removed, not slowed. In **forced colours** the sweep goes and text bones paint in GrayText.\n\nBones are hidden from assistive tech. `SkeletonGroup` puts `aria-busy` on the region — once, not on every bone — and speaks its label through a polite status that is present from the first render.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Block: Story = { args: { className: 'h-40 w-72' } }

export const Shapes: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col gap-2">
        <span className="rotulo text-ink-2">Block</span>
        <Skeleton className="h-24 w-40" />
      </div>
      <div className="flex w-56 flex-col gap-2">
        <span className="rotulo text-ink-2">Text</span>
        <SkeletonText lines={4} className="text-base" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="rotulo text-ink-2">Avatar</span>
        <div className="flex items-end gap-3">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Skeleton key={size} shape="avatar" size={size} />
          ))}
        </div>
      </div>
    </div>
  ),
}

function AgentCardBones() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton shape="avatar" size="lg" />
        <div className="flex flex-1 flex-col gap-2 text-base">
          <Skeleton shape="text" className="w-2/3" />
          <Skeleton shape="text" className="w-1/3 text-sm" />
        </div>
      </div>
      <SkeletonText lines={3} className="text-sm" />
    </div>
  )
}

export const Card: Story = {
  render: () => (
    <SkeletonGroup
      loading
      label="Loading agent"
      fallback={<AgentCardBones />}
      className="w-80 bg-cloth-pale p-5 shadow-cut"
    />
  ),
}

export const LoadingToLoaded: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The group swaps bones for content in place. The bones are cut to the content’s geometry — an avatar bone for the avatar, a short line for the name — so the layout barely moves when the data lands.',
      },
    },
  },
  render: () => {
    const [loading, setLoading] = React.useState(true)
    return (
      <div className="flex flex-col items-start gap-4">
        <Button size="sm" variant="secondary" onClick={() => setLoading((l) => !l)}>
          {loading ? 'Finish loading' : 'Load again'}
        </Button>
        <SkeletonGroup
          loading={loading}
          label="Loading agent"
          fallback={<AgentCardBones />}
          className="w-80 bg-cloth-pale p-5 shadow-cut"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name="Support triage" size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="m-0 text-base font-semibold text-ink">Support triage</p>
                <p className="m-0 flex items-center gap-2 text-sm text-ink-2">
                  <Badge tone="success" dot>
                    Live
                  </Badge>
                </p>
              </div>
            </div>
            <p className="m-0 text-sm text-ink-2">
              Reads every new Cayuco support ticket, tags it by product area and drafts a first reply for a person to
              approve.
            </p>
          </div>
        </SkeletonGroup>
      </div>
    )
  },
}
