import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Play, Plus, Square, Trash2 } from 'lucide-react'
import { fn } from 'storybook/test'

import { ForceState, type ForcedState } from '../../docs/blocks/force-state'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../table'
import { Button, type ButtonProps, IconButton } from './button'
import { wrappingButtonSlot } from './wrapping-slot'

const meta = {
  title: 'Components/Actions/Button',
  tags: ['stable'],
  component: Button,
  args: { children: 'Run agent', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A cut shape. Hover reveals the band of the layer beneath — the edge grows outward as a `box-shadow`, so nothing around it moves. **Primary is ink, not red**: in a tool with a primary action in every panel, red has to keep meaning *this destroys something*.',
      },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Run agent
      </Button>
      <Button {...args} variant="secondary">
        Duplicate
      </Button>
      <Button {...args} variant="danger">
        Delete run
      </Button>
      <Button {...args} variant="ghost">
        Cancel
      </Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Sizes read their height from the density tokens. Switch **Density** in the toolbar: the same `md` button is 28px in a compact table toolbar and 48px in a spacious form.',
      },
    },
  },
}

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} icon={<Play />}>
        Start run
      </Button>
      <Button {...args} variant="secondary" icon={<Plus />}>
        New rollout
      </Button>
      <Button {...args} variant="secondary" withArrow>
        Open trace
      </Button>
      <Button {...args} variant="danger" icon={<Trash2 />}>
        Delete
      </Button>
    </div>
  ),
}

export const Loading: Story = {
  args: { loading: true, children: 'Deploying' },
  parameters: {
    docs: {
      description: {
        story:
          'The label stays, so the button never changes width mid-click. A strip of *working relleno* — the system’s indeterminate texture — runs along its foot. The button remains focusable and is announced as busy.',
      },
    },
  },
}

export const Disabled: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} disabled>
        Primary
      </Button>
      <Button {...args} variant="secondary" disabled>
        Secondary
      </Button>
      <Button {...args} variant="danger" disabled>
        Danger
      </Button>
      <Button {...args} variant="ghost" disabled>
        Ghost
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Stated, not faded. `opacity-50` would fade the keyline too and drop the label near 2:1 — a failure axe never reports, because disabled controls are exempt from contrast. Every variant takes the disabled ground and muted ink, and primary and danger keep a thin band of their role inside the keyline, so the panel’s main action keeps its place and a destructive one is still recognisable while it waits for its confirmation.',
      },
    },
  },
}

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton label="Copy run id" variant="secondary" size="sm">
        <Copy />
      </IconButton>
      <IconButton label="Start" variant="primary">
        <Play />
      </IconButton>
      <IconButton label="Stop run" variant="danger">
        <Square />
      </IconButton>
      <IconButton label="Delete" variant="ghost" size="lg">
        <Trash2 />
      </IconButton>
    </div>
  ),
}

export const OnInkPanel: Story = {
  render: (args) => (
    <div className="on-ink flex flex-wrap items-center gap-3 p-6">
      <Button {...args} variant="secondary">
        Secondary on ink
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
    </div>
  ),
}

const VARIANTS: { variant: NonNullable<ButtonProps['variant']>; label: string }[] = [
  { variant: 'primary', label: 'Run agent' },
  { variant: 'secondary', label: 'Duplicate' },
  { variant: 'danger', label: 'Delete run' },
  { variant: 'ghost', label: 'Cancel' },
]
const STATES: { name: string; force?: ForcedState[]; props?: Partial<ButtonProps> }[] = [
  { name: 'Rest' },
  { name: 'Hover', force: ['hover'] },
  { name: 'Pressed', force: ['hover', 'active'] },
  // Not a tab stop: its ring is painted at rest, so tabbing to it would change
  // nothing, which is exactly what the browser audit's focus scan fails.
  { name: 'Focus', force: ['focus-visible'], props: { tabIndex: -1 } },
  { name: 'Loading', props: { loading: true } },
  { name: 'Disabled', props: { disabled: true } },
]

export const States: Story = {
  render: () => (
    <Table>
      <TableCaption>Every button variant in every state. Hover, pressed and focus are forced from the button’s own rules.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Variant</TableHead>
          {STATES.map((state) => (
            <TableHead key={state.name}>{state.name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {VARIANTS.map(({ variant, label }) => (
          <TableRow key={variant}>
            <TableCell className="etiqueta text-ink-2">{variant}</TableCell>
            {STATES.map((state) => {
              const button = (
                <Button variant={variant} {...state.props}>
                  {label}
                </Button>
              )
              return (
                <TableCell key={state.name} className="py-3">
                  {state.force ? <ForceState state={state.force}>{button}</ForceState> : button}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Every variant in every state, side by side, so a change to one state is visible against the others in review and in the visual baselines. Hover reveals the gold band; **pressed closes it with ink**, or, on the edgeless ghost, draws the ink cut inward, so the press is a step of its own rather than a copy of hover; focus is the two-tone ring; loading keeps the label and runs the working strip; disabled takes the disabled ground and keeps a band of the variant’s role. The hover, pressed and focus cells are forced by copying the component’s own `:hover`, `:active` and `:focus-visible` rules (src/docs/blocks/force-state.tsx), not by restyling the button, so what is photographed is what ships.',
      },
    },
  },
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <div className={`flex flex-wrap gap-3 ${wrappingButtonSlot}`}>
          <Button>Re-run every failed step from the beginning</Button>
          <Button variant="secondary" withArrow>
            Open the full trace in a new panel
          </Button>
        </div>
      </HardState>
      <HardState state="rtl">
        <div className="flex flex-wrap gap-3">
          <Button withArrow>تشغيل الوكيل</Button>
          <Button variant="secondary" icon={<Copy />}>
            نسخ المعرّف
          </Button>
          <Button variant="ghost">إلغاء</Button>
        </div>
      </HardState>
      <HardState state="disabled">
        <div className="flex flex-wrap gap-3">
          <Button disabled>Save changes</Button>
          <Button variant="danger" disabled>
            Revoke key
          </Button>
          <Button loading>Deploying</Button>
        </div>
      </HardState>
      <HardState state="error">
        <div className="flex flex-col items-start gap-2">
          <Button variant="danger" icon={<Trash2 />} aria-describedby="button-hard-error">
            Delete run
          </Button>
          <p id="button-hard-error" className="m-0 text-sm text-ink-danger">
            The run could not be deleted. Try again.
          </p>
        </div>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A button keeps one line, because a toolbar relies on its height; where a sentence-length label can appear (an empty state, an uncertainty note) the slot lets it take a second line instead of running past a phone’s edge, as here. In right to left the arrow and the icon change sides; disabled is stated per variant; an action that failed keeps its button and says why beside it, because a button has no error state of its own.',
      },
    },
  },
}
