import type { Meta, StoryObj } from '@storybook/react-vite'
import { Trash2 } from 'lucide-react'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { Field, Input } from '../field'
import { AlertDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog'

const meta = {
  title: 'Components/Overlays/Dialog',
  component: DialogContent,
  parameters: {
    // Base UI's focus trap puts aria-hidden sentinel spans (tabindex=0) beside
    // the modal and immediately redirects any focus they receive back into
    // the popup. axe sees "focusable inside aria-hidden" without seeing the
    // redirect. Verified by keyboard in the tests; disabled for that rule only.
    a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
    docs: {
      description: {
        component:
          'A panel cut out of the page and laid on top of it. The top seam is the full **relleno** — the layer colour slit with ink — which is how a mola marks where one layer ends; it says “you are inside something” without a title bar or a tint. The backdrop recedes toward the page’s own cloth rather than toward grey. Focus trap, scroll lock, Escape and the inert page come from Base UI; the corner close is always present, because a touch screen-reader user has no Escape key.',
      },
    },
  },
  args: { title: 'Rename rollout' },
} satisfies Meta<typeof DialogContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary">Rename rollout</Button>} />
      <DialogContent
        title="Rename rollout"
        description="The slug stays the same, so links to this rollout keep working."
        footer={
          <>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <DialogClose render={<Button>Save name</Button>} />
          </>
        }
      >
        <Field label="Name">{(control) => <Input {...control} defaultValue="Help panel for new workspaces — v2" />}</Field>
      </DialogContent>
    </Dialog>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Dialog key={size}>
          <DialogTrigger render={<Button variant="secondary">Open {size}</Button>} />
          <DialogContent
            size={size}
            title={`A ${size} dialog`}
            description="Width is a cap, not a fixed size: on a phone every size is the viewport minus a 16px gutter."
            footer={<DialogClose render={<Button>Done</Button>} />}
          />
        </Dialog>
      ))}
    </div>
  ),
}

export const LongContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary">View system prompt</Button>} />
      <DialogContent
        size="lg"
        band="anil"
        title="System prompt · knowledge-agent@41"
        description="Read-only. Edit it in the agent's configuration."
        footer={<DialogClose render={<Button>Close</Button>} />}
      >
        <div className="space-y-3 font-text text-base leading-body text-ink-2">
          {Array.from({ length: 14 }, (_, i) => (
            <p key={i} className="m-0">
              Section {i + 1}. Answer only from the indexed knowledge base. When the sources disagree, say so and cite both; when
              they are silent, say that rather than guessing. Prefer the most recent document when two versions of a policy
              conflict.
            </p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The header and footer stay put and only the body scrolls, so the way out is never scrolled away. The band takes any layer: añil here, for a read-only informational sheet.',
      },
    },
  },
}

export const DestructiveConfirm: Story = {
  render: () => (
    <AlertDialog
      trigger={
        <Button variant="danger" icon={<Trash2 />}>
          Delete run
        </Button>
      }
      title="Delete this run?"
      description="Its trace, tool calls and outputs are removed for everyone. This cannot be undone."
      confirmLabel="Delete run"
      onConfirm={fn()}
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          '`role="alertdialog"`: an outside click does not dismiss it, because a stray click on the page behind must not count as an answer. Focus opens on **Cancel** — the safe answer is the one a reflexive Enter gives.',
      },
    },
  },
}

export const TypedConfirmation: Story = {
  render: () => (
    <AlertDialog
      defaultOpen
      trigger={<Button variant="danger">Purge index</Button>}
      title="Purge the knowledge index?"
      description="Every embedded document is dropped and agents answer from nothing until the next ingest finishes, about 40 minutes."
      confirmLabel="Purge index"
      confirmationText="kb-prod-eu"
      onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1600))}
    />
  ),
  parameters: {
    docs: {
      // Opens on render: its own frame, so the modal does not lock the docs page.
      story: { inline: false, height: '420px' },
      description: {
        story:
          'For an irreversible action at scale, the confirm stays disarmed until the exact resource name is typed. `onConfirm` may return a promise: the button shows its working strip, nothing else is pressable, and the dialog only closes when the work succeeds.',
      },
    },
  },
}
