import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleHelp, FileText, LifeBuoy, Play, Settings } from 'lucide-react'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button, IconButton } from '../button'
import { wrappingButtonSlot } from '../button/wrapping-slot'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { type CommandGroup, CommandPalette, useCommandShortcut } from '../command'
import { Input } from '../field'
import { ToastProvider } from '../toast'
import { ShortcutsDialog } from './shortcuts-dialog'
import { HotkeysProvider, useHotkeys } from './use-hotkeys'

const groups: CommandGroup[] = [
  {
    heading: 'Actions',
    items: [{ id: 'new-run', label: 'Start a new run', icon: <Play />, hotkey: 'c', onSelect: fn() }],
  },
  {
    heading: 'Go to',
    items: [
      { id: 'escalations', label: 'Escalations', icon: <LifeBuoy />, hotkey: 'g e', onSelect: fn() },
      { id: 'documents', label: 'Documents', icon: <FileText />, hotkey: 'g d', onSelect: fn() },
      { id: 'settings', label: 'Settings', icon: <Settings />, hotkey: 'g s', onSelect: fn() },
    ],
  },
]

/** A page's worth of bindings: the palette, its commands, and two of the page's own. */
function CayucoPage({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = React.useState(false)
  useCommandShortcut(() => setPalette((o) => !o))
  useHotkeys('/', () => document.getElementById('runs-search')?.focus(), { label: 'Search runs', group: 'Runs' })
  useHotkeys('shift+r', fn(), { label: 'Refresh the table', group: 'Runs' })
  return (
    <>
      <CommandPalette open={palette} onOpenChange={setPalette} groups={groups} />
      {children}
    </>
  )
}

const meta = {
  title: 'Components/Overlays/Shortcuts dialog',
  tags: ['experimental'],
  component: ShortcutsDialog,
  args: { defaultOpen: true },
  decorators: [
    (Story) => (
      // The registry outside ToastProvider, so the toast region lists its F6.
      <HotkeysProvider platform="other">
        <ToastProvider>
          <CayucoPage>
            <Story />
          </CayucoPage>
        </ToastProvider>
      </HotkeysProvider>
    ),
  ],
  parameters: {
    docs: {
      story: { inline: false, height: '620px' },
      description: {
        component:
          'Every keyboard shortcut the page binds, opened with `?`. It lists the `HotkeysProvider` registry and nothing else: each row is a live `useHotkeys` binding, printed from the same string the listener matches, so the list cannot drift from the keys. `mod` is ⌘ on a Mac and Ctrl elsewhere, each platform’s own convention. The palette’s ⌘K, its commands’ `hotkey`s and the toast region’s F6 register themselves. Keys are keycaps for the eye and words for a screen reader: “Control K”, “G, then E”. A plain-key shortcut never fires while someone is typing, or mid-composition in an input method.',
      },
    },
  },
} satisfies Meta<typeof ShortcutsDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    trigger: (
      <IconButton label="Keyboard shortcuts" variant="secondary">
        <CircleHelp />
      </IconButton>
    ),
  },
}

export const OnAMac: Story = {
  decorators: [
    (Story) => (
      <HotkeysProvider platform="apple">
        <CayucoPage>
          <Story />
        </CayucoPage>
      </HotkeysProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'The same bindings with `platform="apple"`: `mod+k` is ⌘K, `shift+r` is ⇧R, in the Mac’s own modifier order. The platform is detected from the browser; pinning it is for a story, a test or a server render. The toast region’s F6 is missing here because this provider sits inside the ToastProvider, not around it.',
      },
    },
  },
}

function TypingDemo() {
  const [presses, setPresses] = React.useState(0)
  useHotkeys('n', () => setPresses((p) => p + 1), { label: 'Count a press', group: 'Demo' })
  return (
    <div className="grid max-w-sm gap-3">
      <Input id="runs-search" aria-label="Search runs" placeholder="Type n here: nothing counts" />
      <p className="m-0 text-sm text-ink-2" aria-live="off">
        Pressed <span className="font-semibold text-ink tabular-nums">{presses}</span> times outside the field.
      </p>
      <ShortcutsDialog
        trigger={
          <Button variant="secondary" className="justify-self-start">
            Show shortcuts
          </Button>
        }
      />
    </div>
  )
}

export const TypingIsSafe: Story = {
  args: { defaultOpen: false },
  render: () => <TypingDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Press N on the page and the count goes up; type N in the field and it does not. A chord with ⌘ or Ctrl would still fire from the field, because it types nothing: that is how ⌘K reaches the palette from a search box.',
      },
    },
  },
}

export const NothingBound: Story = {
  decorators: [
    (Story) => (
      <HotkeysProvider>
        <Story />
      </HotkeysProvider>
    ),
  ],
  args: { hotkey: false },
  parameters: {
    docs: { description: { story: 'With nothing bound, and `hotkey={false}` so the dialog binds no `?` of its own, it says so in a sentence.' } },
  },
}

function HardStatesDemo() {
  // A binding with a sentence for a label, so the open dialog's long-label
  // row is in the registry the RTL cell lists.
  useHotkeys('shift+e', fn(), { label: 'Export every failed run in the current filter as a CSV file', group: 'Runs' })
  return (
    <HardStatesFrame>
      <HardState state="long-label" className={wrappingButtonSlot}>
        <ShortcutsDialog
          hotkey={false}
          trigger={<Button variant="secondary">Show every keyboard shortcut on this page</Button>}
        />
      </HardState>
      <HardState state="rtl">
        <ShortcutsDialog
          defaultOpen
          dir="rtl"
          lang="ar"
          title="اختصارات لوحة المفاتيح"
          trigger={<Button variant="secondary">الاختصارات</Button>}
        />
      </HardState>
      <HardState state="disabled">
        <div className="flex flex-col items-start gap-2">
          <Button variant="secondary" disabled aria-describedby="shortcuts-hard-disabled-reason">
            Show shortcuts
          </Button>
          <p id="shortcuts-hard-disabled-reason" className="m-0 text-sm text-ink-muted">
            Shortcuts are off while a run is being replayed.
          </p>
        </div>
      </HardState>
    </HardStatesFrame>
  )
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  args: { defaultOpen: false },
  render: () => <HardStatesDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Only one dialog can be open, so the right-to-left one is: the keycaps sit at the start of each row and the labels at the end, but each sequence still reads left to right (G then E, Ctrl then K), because a shortcut is typed in a fixed order in every direction, and a sentence-length label wraps beside its keys instead of pushing them off the sheet. The long-label trigger wraps in its slot; the disabled trigger says why beside it. The dialog has no error state: it lists bindings that exist, and a binding that failed to register is not listed.',
      },
    },
  },
}
