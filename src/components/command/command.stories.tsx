import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bot, FileText, LifeBuoy, Moon, Play, Plus, Search, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { KbdChord } from '../typography'
import { type CommandGroup, CommandPalette, useCommandShortcut } from './command'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { wrappingButtonSlot } from '../button/wrapping-slot'

const groups: CommandGroup[] = [
  {
    heading: 'Actions',
    items: [
      { id: 'new-run', label: 'Start a new run', icon: <Play />, shortcut: ['⌘', 'R'], keywords: ['execute', 'invoke'], onSelect: fn() },
      { id: 'new-rollout', label: 'New rollout', icon: <Plus />, shortcut: ['⌘', 'O'], onSelect: fn() },
      { id: 'theme', label: 'Toggle dark theme', icon: <Moon />, keywords: ['appearance', 'night'], onSelect: fn() },
      { id: 'purge', label: 'Purge knowledge index', icon: <Trash2 />, description: 'Owners only', disabled: true, onSelect: fn() },
    ],
  },
  {
    heading: 'Agents',
    items: [
      { id: 'a1', label: 'knowledge-agent', description: 'Answers from the help centre', icon: <Bot />, onSelect: fn() },
      { id: 'a2', label: 'refund-review-agent', description: 'Reviews a refund request', icon: <Bot />, onSelect: fn() },
      { id: 'a3', label: 'abuse-triage', description: 'Sorts abuse reports', icon: <Bot />, onSelect: fn() },
    ],
  },
  {
    heading: 'Go to',
    items: [
      { id: 'g1', label: 'Escalations', icon: <LifeBuoy />, shortcut: ['G', 'E'], onSelect: fn() },
      { id: 'g2', label: 'Documents', icon: <FileText />, shortcut: ['G', 'D'], onSelect: fn() },
      { id: 'g3', label: 'Settings', icon: <Settings />, shortcut: ['G', 'S'], keywords: ['preferences'], onSelect: fn() },
    ],
  },
]

const meta = {
  title: 'Components/Overlays/Command palette',
  tags: ['stable'],
  component: CommandPalette,
  args: { open: true, onOpenChange: fn(), groups },
  parameters: {
    // Base UI's focus trap puts aria-hidden sentinel spans (tabindex=0) beside
    // the modal and immediately redirects any focus they receive back into
    // the popup. axe sees "focusable inside aria-hidden" without seeing the
    // redirect. Verified by keyboard in the tests; disabled for that rule only.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    docs: {
      story: { inline: false, height: '560px' },
      description: {
        component:
          'The keyboard’s front door. The input is a `combobox` that never loses focus; results are a `listbox` of `option`s in labelled `group`s; the highlight moves via `aria-activedescendant` so typing never has to re-focus. The highlight is the **ink fill**, as in Menu, and wraps at both ends. It opens in the top third so results grow downward instead of the box jumping with each keystroke. Matching is plain substring on every word — deliberately not fuzzy: a matcher that offers “Delete agent” for “dagent” is a liability.',
      },
    },
  },
} satisfies Meta<typeof CommandPalette>

export default meta
type Story = StoryObj<typeof meta>

function WithShortcut() {
  const [open, setOpen] = useState(false)
  useCommandShortcut(() => setOpen((o) => !o))
  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" icon={<Search />} onClick={() => setOpen(true)}>
        Search
      </Button>
      <span className="text-sm text-ink-muted">
        or press <KbdChord keys={['⌘', 'K']} />
      </span>
      <CommandPalette open={open} onOpenChange={setOpen} groups={groups} />
    </div>
  )
}

export const Default: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(args.open)
    return <CommandPalette {...args} open={open} onOpenChange={setOpen} />
  },
}

export const OpenWithCmdK: Story = {
  render: () => <WithShortcut />,
  parameters: {
    docs: { description: { story: '`useCommandShortcut` binds ⌘K **and** Ctrl-K — half of every internal team is not on a Mac.' } },
  },
}

export const NoMatches: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(true)
    return (
      <CommandPalette
        {...args}
        open={open}
        onOpenChange={setOpen}
        groups={[]}
        renderEmpty={() => 'No commands yet — this workspace has no agents.'}
      />
    )
  },
}

const longGroups: CommandGroup[] = [
  {
    heading: 'Agents',
    items: [
      {
        id: 'long-1',
        label: 'refund-and-chargeback-triage-agent-for-the-support-region',
        description: 'Reviews a refund request, checks the account’s history and escalates to a person',
        icon: <Bot />,
        onSelect: () => {},
      },
    ],
  },
]

const arabicGroups: CommandGroup[] = [
  {
    heading: 'إجراءات',
    items: [
      { id: 'ar-run', label: 'بدء تشغيل جديد', icon: <Play />, shortcut: ['⌘', 'R'], onSelect: () => {} },
      { id: 'ar-theme', label: 'تبديل المظهر الداكن', icon: <Moon />, onSelect: () => {} },
      { id: 'ar-purge', label: 'مسح فهرس المعرفة', icon: <Trash2 />, description: 'للمالكين فقط', disabled: true, onSelect: () => {} },
    ],
  },
  {
    heading: 'انتقال إلى',
    items: [
      { id: 'ar-esc', label: 'التصعيدات', icon: <LifeBuoy />, onSelect: () => {} },
      { id: 'ar-settings', label: 'الإعدادات', icon: <Settings />, onSelect: () => {} },
    ],
  },
]

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label" className={wrappingButtonSlot}>
        <CommandPalette
          label="Command palette, long names"
          groups={longGroups}
          trigger={
            <Button variant="secondary" icon={<Search />}>
              Search agents, runs and settings
            </Button>
          }
        />
      </HardState>
      <HardState state="rtl">
        <CommandPalette
          defaultOpen
          dir="rtl"
          lang="ar"
          label="لوحة الأوامر"
          placeholder="اكتب أمرًا أو ابحث…"
          groups={arabicGroups}
          trigger={
            <Button variant="secondary" icon={<Search />}>
              بحث
            </Button>
          }
        />
      </HardState>
      <HardState state="disabled">
        <div className="flex flex-col items-start gap-2">
          <Button variant="secondary" icon={<Search />} disabled aria-describedby="command-hard-disabled-reason">
            Search
          </Button>
          <p id="command-hard-disabled-reason" className="m-0 text-sm text-ink-muted">
            Search is available once the workspace has loaded.
          </p>
        </div>
      </HardState>
    </HardStatesFrame>
  ),
  args: { open: undefined },
  parameters: {
    docs: {
      story: { inline: false, height: '560px' },
      description: {
        story:
          'Only one modal can be open, so the right-to-left palette is the one shown open: the search icon, the shortcuts and the descriptions mirror, though each shortcut keeps its typing order (G then R) left to right, and a disabled command (“Owners only”) is shown, muted and stated, never hidden. A long agent name breaks anywhere rather than widening the palette; a trigger that cannot open yet is disabled and says why. The palette has no error state: a command that fails reports where its result would have appeared, and “no matches” is the empty state, not an error.',
      },
    },
  },
}
