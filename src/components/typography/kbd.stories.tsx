import type { Meta, StoryObj } from '@storybook/react-vite'

import { Kbd, KbdChord } from './kbd'

const meta = {
  title: 'Components/Typography/Kbd',
  component: Kbd,
  args: { children: 'Esc' },
  parameters: {
    docs: {
      description: {
        component:
          'A key as a cut shape with a heavier foot — the one honest solid offset in the system, because a keycap really is a block that moves down. Set in Archivo, not mono: `⌘K` labels a physical object, it is not a machine literal.',
      },
    },
  },
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Chords: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-sm text-ink-2">
      <p className="m-0 flex items-center gap-2">
        Open the command palette <KbdChord keys={['⌘', 'K']} />
      </p>
      <p className="m-0 flex items-center gap-2">
        Send <KbdChord keys={['⌘', '↵']} /> · New line <KbdChord keys={['⇧', '↵']} />
      </p>
      <p className="m-0 flex items-center gap-2">
        Stop the run <Kbd>Esc</Kbd>
      </p>
    </div>
  ),
}
