import type { Meta, StoryObj } from '@storybook/react-vite'
import { Trash2 } from 'lucide-react'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../button'
import { Field, Input } from '../field'
import { AlertDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { wrappingButtonSlot } from '../button/wrapping-slot'

const meta = {
  title: 'Components/Overlays/Dialog',
  tags: ['stable'],
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
          'A panel cut out of the page and laid on top of it. The top seam is the full **relleno** — the layer colour slit with ink — which is how a mola marks where one layer ends; it says “you are inside something” without a title bar or a tint. The backdrop recedes toward the page’s own cloth rather than toward grey. Focus trap, scroll lock, Escape and the inert page come from Base UI; the corner close is always present, because a touch screen-reader user has no Escape key. The action row stacks full width, the confirm on top, when it is narrower than 24rem — so a small alert dialog never strands its confirm on a second line.',
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

const TIMEOUT = 'Not deleted. The trace store didn’t answer within 10 seconds. The run is unchanged.'

export const ConfirmFails: Story = {
  name: 'Confirm fails',
  render: function Render() {
    const [error, setError] = React.useState<string | undefined>(TIMEOUT)
    return (
      <AlertDialog
        defaultOpen
        trigger={
          <Button variant="danger" icon={<Trash2 />}>
            Delete run
          </Button>
        }
        title="Delete this run?"
        description="Its trace, tool calls and outputs are removed for everyone. This cannot be undone."
        confirmLabel="Delete run"
        error={error}
        onOpenChange={(open) => (open ? setError(undefined) : undefined)}
        onConfirm={async () => {
          await new Promise((resolve) => setTimeout(resolve, 1200))
          setError(TIMEOUT)
          throw new Error('timeout')
        }}
      />
    )
  },
  parameters: {
    docs: {
      // Opens on render: its own frame, so the modal does not lock the docs page.
      story: { inline: false, height: '420px' },
      description: {
        story:
          'When `onConfirm` rejects, the dialog stays open and `error` says why, starting with what did not happen. It sits over the buttons, next to the confirm that failed, drawn as a field error is: the rojo cut square, the words, the danger ink. It is a `role="alert"`, announced once when it appears, and it describes the confirm button, so focus there reads the reason with the verb. It is hidden while a retry is pending, so a second failure is announced again.',
      },
    },
  },
}

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label" className={wrappingButtonSlot}>
        <Dialog>
          <DialogTrigger render={<Button variant="secondary">Rename the help panel rollout for new workspaces</Button>} />
          <DialogContent
            title="Rename the help panel rollout for new workspaces in the Cayuco support region"
            description="The slug stays the same, so links to this rollout keep working."
            footer={
              <>
                <DialogClose render={<Button variant="ghost">Keep the current name</Button>} />
                <DialogClose render={<Button>Save the new name</Button>} />
              </>
            }
          >
            <Field label="Name">{(control) => <Input {...control} defaultValue="Help panel for new workspaces — v2" />}</Field>
          </DialogContent>
        </Dialog>
      </HardState>
      <HardState state="rtl">
        <Dialog defaultOpen>
          <DialogTrigger render={<Button variant="secondary">إعادة تسمية الوكيل</Button>} />
          <DialogContent
            dir="rtl"
            lang="ar"
            title="إعادة تسمية الوكيل"
            description="يبقى المعرّف كما هو، فتستمر الروابط في العمل."
            footer={
              <>
                <DialogClose render={<Button variant="ghost">إلغاء</Button>} />
                <DialogClose render={<Button>حفظ الاسم</Button>} />
              </>
            }
          >
            <Field label="الاسم">{(control) => <Input {...control} defaultValue="وكيل المعرفة" />}</Field>
          </DialogContent>
        </Dialog>
      </HardState>
      <HardState state="disabled">
        <div className="flex flex-col items-start gap-2">
          <Button variant="danger" icon={<Trash2 />} disabled aria-describedby="dialog-hard-disabled-reason">
            Delete run
          </Button>
          <p id="dialog-hard-disabled-reason" className="m-0 text-sm text-ink-muted">
            A run can be deleted once it has stopped.
          </p>
        </div>
      </HardState>
      <HardState state="error">
        <AlertDialog
          trigger={
            <Button variant="danger" icon={<Trash2 />}>
              Delete run
            </Button>
          }
          title="Delete this run?"
          description="Its trace, tool calls and outputs are removed for everyone. This cannot be undone."
          confirmLabel="Delete run"
          error={TIMEOUT}
          onConfirm={fn()}
        />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      story: { inline: false, height: '520px' },
      description: {
        story:
          'Only one modal can be open, so the right-to-left dialog is the one shown open: the close button moves to the other corner, the footer order mirrors and the field’s label and text run from the right. The others wait behind their triggers: a long title wraps inside the dialog rather than widening it, a trigger that cannot open yet is disabled and says why beside it, and an alert dialog whose confirm failed opens with the reason over its buttons (as in Confirm fails).',
      },
    },
  },
}
