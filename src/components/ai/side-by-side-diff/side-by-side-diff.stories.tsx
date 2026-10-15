import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { DASHBOARD_DIFF, FLAG_DIFF, PROMPT_AFTER, PROMPT_BEFORE } from '../_story-data/change'
import { ChangeReview, FileDiff } from '../change-review'
import { HardState, HardStates as HardStatesFrame } from '../../../docs/blocks/hard-states'

import { SideBySideDiff } from './side-by-side-diff'

const meta = {
  title: 'AI/Side-by-side diff',
  tags: ['experimental'],
  component: SideBySideDiff,
  args: {
    title: 'System prompt, support triage agent',
    before: PROMPT_BEFORE,
    after: PROMPT_AFTER,
    beforeLabel: 'Live',
    afterLabel: 'Proposed',
  },
  decorators: [(Story) => <div className="max-w-5xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'Two versions of one text side by side: the old in one pane, the new in the other, each change opposite its replacement. Pass `before` and `after` and the diff is worked out for you (`diffLines`), or pass a unified `diff` or `hunks` as to `FileDiff`.',
          '',
          '- **Lines never wrap; the panes scroll.** In code and config the indentation is the structure, and two wrapped panes stop lining up row for row. Each pane scrolls sideways with the scroll-edge cue, the two scroll together, and both are as wide as the longest line on either side, so the column being compared stays opposite itself.',
          '- **Below 48rem it is one column.** The panes are a container query: a phone, or a side panel on a wide screen, gets the unified lines `FileDiff` draws, wrapped, because there is no room for two panes of code.',
          '- **Two regions, read in turn.** Each pane is a focusable region named by its label and the title. A screen reader hears the old version, then the new, each changed line prefixed “Removed:” or “Added:”; the blank rows that keep the panes aligned are hidden from it.',
          '- **State is never colour alone.** A changed line is a wash, a +/− glyph and a word. The gutter stays put while the code scrolls under it, and is hidden from assistive technology and from a copy.',
          '- **Composed, not copied.** The same parser, pairing, glyphs and `ChangeCount` as `FileDiff`, and it sits in a `ChangeReview` beside FileDiffs.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof SideBySideDiff>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const FromUnifiedDiff: Story = {
  args: { title: 'flags/help_panel_v2.yaml', before: undefined, after: undefined, diff: FLAG_DIFF, beforeLabel: 'Before', afterLabel: 'After' },
  parameters: {
    docs: {
      description: {
        story: 'A unified diff string, as a tool returns it: two hunks, each opened by its range and section, kept in view while the panes scroll.',
      },
    },
  },
}

export const NoChanges: Story = {
  args: { after: PROMPT_BEFORE },
  parameters: { docs: { description: { story: 'Two identical versions say so in words rather than drawing two empty panes.' } } },
}

export const Narrow: Story = {
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        story: 'In a container narrower than 48rem, such as a side panel, the panes give way to one column of wrapped lines, the same lines `FileDiff` draws.',
      },
    },
  },
}

export const InChangeReview: Story = {
  render: (args) => (
    <ChangeReview
      title="Point new Starter workspaces at the help panel"
      agent="Cayuco research agent"
      model="cayuco-deep-3"
      summary={<p className="m-0">Starter workspaces that read the help panel filed fewer tickets. This tells the triage agent to link the matching article first, and widens the dashboard to show the effect.</p>}
      onDecide={fn()}
    >
      <SideBySideDiff {...args} />
      <FileDiff path="dashboards/help-panel.yaml" diff={DASHBOARD_DIFF} layout="split" />
    </ChangeReview>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Inside a `ChangeReview`, beside a `FileDiff`: the prompt is compared side by side, the dashboard reviewed as a file, and one decision covers both.',
      },
    },
  },
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame className="md:grid-cols-1">
      <HardState state="long-label">
        <SideBySideDiff
          title="System prompt for the support triage agent on Starter workspaces created in the last fourteen days"
          before={PROMPT_BEFORE}
          after={PROMPT_AFTER}
          beforeLabel="Live"
          afterLabel="Proposed"
        />
      </HardState>
      <HardState state="rtl">
        <SideBySideDiff
          title="flags/help_panel_v2.yaml"
          before={'variant: control\npercent: 50'}
          after={'variant: panel\npercent: 100'}
          beforeLabel="الحالي"
          afterLabel="المقترح"
        />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long title wraps and, at a phone’s width, the panes give way to one column of wrapped lines; full width, in right to left, the old pane moves to the right and the new to the left while the code inside stays left to right. A diff has no disabled state and no error state of its own: it shows two texts, and an unparseable diff is the tool’s failure, shown by the tool call that returned it.',
      },
    },
  },
}
