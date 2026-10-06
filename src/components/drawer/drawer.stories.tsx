import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, FileText, Pause, RotateCcw, Share2 } from 'lucide-react'

import { Badge } from '../badge'
import { Button } from '../button'
import { Checkbox, CheckboxGroup } from '../checkbox'
import { DescriptionList } from '../description-list'
import { Field, Input } from '../field'
import { Select } from '../select'
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger, type DrawerSide } from './drawer'

const meta = {
  title: 'Components/Overlays/Drawer',
  component: DrawerContent,
  parameters: {
    // Same as Dialog: Base UI's focus trap puts aria-hidden sentinel spans
    // (tabindex=0) beside the modal and redirects any focus they receive back
    // into the popup. axe cannot see the redirect; the tests cover it by
    // keyboard. Disabled for that rule only.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    docs: {
      description: {
        component:
          'A Dialog that slides in from an edge: run details beside a table, filters for a list, quick actions on a phone. Built on Base UI **Drawer**, which is Dialog underneath — focus trap, scroll lock, Escape, the inert page — plus **swipe to dismiss**, the gesture a phone user reaches for first. It speaks Dialog’s language: the relleno seam along the top, the same title and description, a backdrop that recedes toward cloth, and a close button that is always there because a touch screen-reader user has no Escape key. `side` is logical (`start`, `end`, `bottom`), so start and end swap in right-to-left and the dismiss swipe follows. Side widths are a cap that always leaves a strip of page on a phone — the obvious place to tap to go back. Only the body scrolls; the footer is pinned behind a keyline so the way out is never scrolled away. A bottom sheet adds a grab handle (a picture of the gesture, hidden from assistive tech) and the device’s safe-area inset under its last row. Stories open on their own in the canvas so they can be screenshotted; in these docs they wait for their trigger.',
      },
    },
  },
  args: { title: 'Run details' },
} satisfies Meta<typeof DrawerContent>

export default meta
type Story = StoryObj<typeof meta>

/** Open in the canvas (for review and screenshots), closed on the docs page, where several open modals would stack. */
function openInCanvas(viewMode: string | undefined) {
  return viewMode !== 'docs'
}

export const RunDetails: Story = {
  render: (_args, { viewMode }) => (
    <Drawer defaultOpen={openInCanvas(viewMode)}>
      <DrawerTrigger render={<Button variant="secondary">View run_5a61c5</Button>} />
      <DrawerContent
        title="Run details"
        description="Support triage · started 14:02 by the inbox router"
        footer={
          <>
            <Button variant="ghost" icon={<FileText />}>
              Open trace
            </Button>
            <Button icon={<RotateCcw />}>Re-run</Button>
          </>
        }
      >
        <DescriptionList
          items={[
            { term: 'Run', detail: 'run_5a61c5', literal: true },
            {
              term: 'Status',
              detail: (
                <Badge tone="success" dot>
                  Succeeded
                </Badge>
              ),
            },
            { term: 'Agent', detail: 'Support triage' },
            { term: 'Model', detail: 'cayuco-steady-3', literal: true },
            { term: 'Tokens', detail: '18,204' },
            { term: 'Cost', detail: '$0.2185' },
            { term: 'Duration', detail: '41s' },
          ]}
        />
        <h3 className="mt-6 mb-2 rotulo text-ink-2">Final answer</h3>
        <div className="flex flex-col gap-3 font-text text-base leading-body text-ink">
          <p>
            The customer’s export failed because the workspace hit its monthly storage cap on the 3rd. I’ve tagged the
            ticket <span className="literal text-sm">billing/storage</span> and routed it to the accounts queue with a
            suggested reply.
          </p>
          <p>
            Two earlier tickets from the same workspace mention slow exports; they are linked in the trace in case the
            cap was the cause there too.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The default: an `end` drawer at `md` (28rem), the properties panel for a row in a runs table. Prose from the model is set in Alegreya, ids in Martian Mono, everything the system says in Archivo.',
      },
    },
  },
}

const AGENTS = [
  { value: 'all', label: 'All agents' },
  { value: 'support-triage', label: 'Support triage' },
  { value: 'knowledge-agent', label: 'Knowledge agent' },
  { value: 'release-notes', label: 'Release notes writer' },
]

export const Filters: Story = {
  render: (_args, { viewMode }) => (
    <Drawer side="start" defaultOpen={openInCanvas(viewMode)}>
      <DrawerTrigger render={<Button variant="secondary">Filters</Button>} />
      <DrawerContent
        size="sm"
        band="anil"
        title="Filter runs"
        description="Applied when you press Show runs."
        footer={
          <>
            <DrawerClose render={<Button variant="ghost">Clear</Button>} />
            <DrawerClose render={<Button>Show 42 runs</Button>} />
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Run id" optional>
            {(control) => <Input {...control} placeholder="run_5a61c5" autoComplete="off" />}
          </Field>
          <Field label="Agent">{(control) => <Select {...control} items={AGENTS} defaultValue="all" />}</Field>
          <CheckboxGroup legend="Status" defaultValue={['failed', 'running']}>
            <Checkbox value="succeeded" label="Succeeded" />
            <Checkbox value="failed" label="Failed" />
            <Checkbox value="running" label="Running" />
            <Checkbox value="cancelled" label="Cancelled" />
          </CheckboxGroup>
          <CheckboxGroup legend="Model">
            <Checkbox value="cayuco-deep-3" label={<span className="literal">cayuco-deep-3</span>} />
            <Checkbox value="cayuco-steady-3" label={<span className="literal">cayuco-steady-3</span>} />
            <Checkbox value="cayuco-swift-2" label={<span className="literal">cayuco-swift-2</span>} />
          </CheckboxGroup>
        </div>
      </DrawerContent>
    </Drawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A `start` drawer at `sm` (20rem) for list filters: it opens on the side the list’s own navigation lives on, and in right-to-left it opens from the right. The footer holds the apply action, so the band is añil — informational, not a commitment.',
      },
    },
  },
}

const ACTIONS = [
  { label: 'Copy run id', icon: <Copy /> },
  { label: 'Share trace', icon: <Share2 /> },
  { label: 'Re-run with same input', icon: <RotateCcw /> },
  { label: 'Pause agent', icon: <Pause /> },
]

export const BottomSheet: Story = {
  render: (_args, { viewMode }) => (
    <Drawer side="bottom" defaultOpen={openInCanvas(viewMode)}>
      <DrawerTrigger render={<Button variant="secondary">Run actions</Button>} />
      <DrawerContent
        size="sm"
        title="Run actions"
        description={
          <>
            <span className="literal">run_5a61c5</span> · Support triage · succeeded 41s ago
          </>
        }
      >
        <ul className="m-0 -mx-2 flex list-none flex-col p-0">
          {ACTIONS.map((action) => (
            <li key={action.label}>
              <DrawerClose
                render={
                  <Button variant="ghost" icon={action.icon} className="w-full justify-start">
                    {action.label}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A `bottom` sheet for quick actions on a phone, where the bottom of the screen is the part a thumb reaches. Full width up to 48rem; `size` sets its height cap instead. Swipe it down, tap the strip of page above it, press Escape, or use Close.',
      },
    },
  },
}

const SIDES: DrawerSide[] = ['start', 'end', 'bottom']

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {SIDES.map((side) => (
        <div key={side} className="flex flex-wrap items-center gap-3">
          <span className="w-16 rotulo text-ink-2">{side}</span>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Drawer key={size} side={side}>
              <DrawerTrigger render={<Button variant="secondary">Open {size}</Button>} />
              <DrawerContent
                size={size}
                title={`${side === 'bottom' ? 'Bottom sheet' : `${side === 'start' ? 'Start' : 'End'} drawer`}, ${size}`}
                description={
                  side === 'bottom'
                    ? 'A bottom sheet takes its size as a height cap: 45%, 70% or nearly all of the screen.'
                    : 'Width is a cap, not a fixed size: on a phone every size leaves a 2.5rem strip of page showing.'
                }
                footer={<DrawerClose render={<Button>Done</Button>} />}
              />
            </Drawer>
          ))}
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Side drawers are 20, 28 and 40rem wide; bottom sheets cap their height instead. Every size yields to the viewport.',
      },
    },
  },
}
