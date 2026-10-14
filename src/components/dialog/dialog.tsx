'use client'

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { Button, IconButton } from '../button'
import { fieldControlClasses, fieldControlSizes } from '../field/field-control'

/**
 * A modal is a panel cut out of the page and laid on top of it, so it is the
 * one place a seam earns the full relleno: an 11px strip of the layer colour
 * slit with ink along its top edge. In the source mola that strip is how a
 * panel announces where one layer ends and the next begins; here it is how a
 * dialog says "you are now inside something" without a title bar or a tint.
 * Gold by default, rojo on a destructive confirm — the band is the only place
 * the dialog's intent shows before a word is read.
 *
 * The backdrop recedes toward the page's own ground (`--backdrop`, cloth at
 * 82%) rather than toward grey. A grey veil is a foreign material in a world
 * with no grey in it, and it also drops the contrast of everything behind it
 * to the same murky middle; cloth keeps the page legible as context while
 * making it plainly inert.
 *
 * Focus, scroll lock, Escape, outside-press and the inert background all come
 * from Base UI. The close button is always rendered: a touch screen reader
 * user has no Escape key, and Base UI's own guidance is that a modal without
 * a `Close` inside it cannot be left.
 *
 * `DialogContent` passes every Base UI `Popup` prop through, `initialFocus`
 * and `finalFocus` included, so where focus lands on close is Base UI's own
 * contract rather than one restated here. AlertDialog builds its popup
 * itself, so it forwards `finalFocus` by name, with the same type.
 */

const dialogPopupVariants = cva(
  [
    'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
    'bg-cloth-pale text-ink rounded-none outline-none',
    'shadow-floating',
    'transition-[opacity,translate,scale] duration-(--motion-base)',
    'data-starting-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:translate-y-[calc(-50%+6px)]',
    'data-ending-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:duration-(--motion-cut)',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-3xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

const backdropClasses = [
  'fixed inset-0 z-50 bg-backdrop',
  'transition-opacity duration-(--motion-base)',
  'data-starting-style:opacity-0 data-ending-style:opacity-0',
]

const bandClass = { oro: 'band-oro', rojo: 'band-rojo', anil: 'band-anil', verde: 'band-verde' } as const
type Band = keyof typeof bandClass

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export interface DialogContentProps
  extends Omit<DialogPrimitive.Popup.Props, 'className' | 'title'>,
    VariantProps<typeof dialogPopupVariants> {
  className?: string
  /** The dialog's accessible name. Required: an unnamed modal is announced as "dialog" and nothing else. */
  title: React.ReactNode
  description?: React.ReactNode
  /** Action row under the body: right-aligned, or stacked full width with the last action on top when the row is under 24rem. Usually a `ghost` cancel and one primary. */
  footer?: React.ReactNode
  /** The layer revealed in the top seam. */
  band?: Band
  /** Hide the corner close button. Only when the footer carries an explicit way out. */
  hideClose?: boolean
}

export function DialogContent({
  className,
  size,
  title,
  description,
  footer,
  band = 'oro',
  hideClose = false,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={cn(backdropClasses)} />
      <DialogPrimitive.Popup data-slot="dialog" className={cn(dialogPopupVariants({ size }), className)} {...props}>
        <DialogFrame
          band={band}
          title={<DialogPrimitive.Title className={titleClasses}>{title}</DialogPrimitive.Title>}
          description={
            description ? (
              <DialogPrimitive.Description className={descriptionClasses}>{description}</DialogPrimitive.Description>
            ) : null
          }
          close={
            hideClose ? null : (
              <DialogPrimitive.Close
                render={
                  <IconButton label="Close" variant="ghost" size="sm">
                    <X />
                  </IconButton>
                }
              />
            )
          }
          footer={footer}
        >
          {children}
        </DialogFrame>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

/**
 * The action row of a dialog or drawer. Under 24rem of width it stacks:
 * full-width buttons, the confirm on top and the way out under it. It used
 * to wrap instead, so a small alert dialog with two longer labels ("Keep
 * editing", "Discard changes") left the confirm alone on a second line,
 * ragged against the first. Measured on the row's own width, not the
 * window, because a small dialog is narrow on every screen.
 */
export const actionRowClasses = [
  'flex flex-col-reverse gap-2 [&>*]:w-full',
  '@sm:flex-row @sm:flex-wrap @sm:items-center @sm:justify-end @sm:[&>*]:w-auto',
] as const

const titleClasses = 'm-0 font-display text-xl font-bold leading-snug tracking-display wdth-display'
const descriptionClasses = 'mt-1.5 mb-0 text-sm text-ink-2'

function DialogFrame({
  band,
  title,
  description,
  close,
  footer,
  error,
  children,
}: {
  band: Band
  title: React.ReactNode
  description: React.ReactNode
  close: React.ReactNode
  footer: React.ReactNode
  error?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <div aria-hidden className={cn('relleno shrink-0', bandClass[band])} />
      <div className="flex items-start gap-4 px-6 pt-5">
        <div className="min-w-0 flex-1">
          {title}
          {description}
        </div>
        {close ? <div className="-mt-1 -me-2">{close}</div> : null}
      </div>
      {children ? <div className="scroll-cloth min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-2 text-sm">{children}</div> : null}
      {error ? <div className="shrink-0 px-6 pt-4">{error}</div> : null}
      {footer ? (
        <div className="@container mt-6 px-6 pb-6">
          <div className={cn(actionRowClasses)}>{footer}</div>
        </div>
      ) : (
        <div className="pb-6" />
      )}
    </>
  )
}

export interface AlertDialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Rendered as the trigger, e.g. a danger `Button`. */
  trigger?: React.ReactElement
  title: React.ReactNode
  description: React.ReactNode
  /** The verb on the confirm button: "Delete run", never "OK". */
  confirmLabel: string
  cancelLabel?: string
  /**
   * May return a promise. While it is pending the confirm button shows its
   * working strip, both buttons stop accepting presses, and the dialog stays
   * open; it closes when the promise resolves and stays open if it rejects,
   * so the operator can see the failure where they caused it.
   */
  onConfirm: () => void | Promise<void>
  /**
   * When set, the confirm button stays disabled until this exact string is
   * typed — the run id, the project slug. For actions that cannot be undone
   * and that a muscle-memory Enter could otherwise fire.
   */
  confirmationText?: string
  /** `danger` cuts the seam in rojo and arms the confirm button in red. */
  tone?: 'danger' | 'neutral'
  /**
   * Why the last confirm failed, starting with what did not happen: "Not
   * revoked. The server didn't answer." Shown between the body and the
   * buttons, announced once when it appears, and linked to the confirm
   * button so it is read again when focus is there. Hidden while a retry is
   * pending. Clear it when the dialog opens for something else.
   */
  error?: React.ReactNode
  /**
   * Where focus goes when the dialog closes: Base UI's `finalFocus`. By
   * default it returns to the trigger, which is right after Cancel. After a
   * confirm that removed the trigger (a deleted row's button), return the
   * element a reader would carry on from: the next row's action, or the
   * list's heading. A function receives how the dialog was closed.
   */
  finalFocus?: AlertDialogPrimitive.Popup.Props['finalFocus']
}

/**
 * The confirmation for an action that destroys something. Built on Base UI's
 * AlertDialog, which differs from Dialog in exactly the ways a destructive
 * confirm needs: `role="alertdialog"`, and an outside click does not dismiss
 * it — a stray click on the page behind must not count as an answer.
 *
 * Initial focus goes to Cancel, not Confirm. The safe answer is the one a
 * reflexive Enter should give.
 *
 * ── a failed confirm says so in its own slot ──
 * The first caller put the failure inside `description`, as a
 * `role="alert"` line. That worked, but it made the error part of the
 * dialog's accessible description, changing what the question was, and
 * every caller had to rebuild the mark, the colour and the live region. The
 * `error` slot sits under the body and over the buttons, next to the confirm
 * that failed, and is drawn as a Field error is: the rojo cut square, the
 * words, the danger ink, so the state is not colour alone.
 *
 * It is mounted, not toggled, and `role="alert"` announces on insertion,
 * once. It unmounts while a retry is pending, so a second failure with the
 * same words is a second insertion and is announced again; a region that
 * kept its text would stay silent and the operator would not know the retry
 * ran. The confirm button points at it with `aria-describedby`, as a field's
 * control points at its error, so focus on the confirm reads the reason with
 * the verb. It is not added to the dialog's own description, which would
 * read it a second time whenever the dialog is announced again.
 */
export function AlertDialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  confirmationText,
  tone = 'danger',
  error,
  finalFocus,
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const isOpen = open ?? uncontrolledOpen
  const [typed, setTyped] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const inputId = React.useId()
  const errorId = React.useId()
  const showError = error !== undefined && error !== null && error !== false && !pending

  const setOpen = (next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
    if (!next) setTyped('')
  }

  const armed = confirmationText === undefined || typed === confirmationText

  async function confirm() {
    if (!armed || pending) return
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // Stay open: the caller surfaces the error; the dialog keeps its context.
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={(next) => (!pending ? setOpen(next) : undefined)}>
      {trigger ? <AlertDialogPrimitive.Trigger render={trigger} /> : null}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className={cn(backdropClasses)} />
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog"
          initialFocus={cancelRef}
          finalFocus={finalFocus}
          className={dialogPopupVariants({ size: 'sm' })}
        >
          <DialogFrame
            band={tone === 'danger' ? 'rojo' : 'oro'}
            title={<AlertDialogPrimitive.Title className={titleClasses}>{title}</AlertDialogPrimitive.Title>}
            description={
              <AlertDialogPrimitive.Description className={descriptionClasses}>{description}</AlertDialogPrimitive.Description>
            }
            close={null}
            error={
              showError ? (
                <p
                  id={errorId}
                  role="alert"
                  className="m-0 flex items-start gap-2 text-sm leading-snug font-medium text-ink-danger"
                >
                  <span aria-hidden className="mt-[0.4em] size-2 shrink-0 bg-rojo shadow-cut" />
                  <span>{error}</span>
                </p>
              ) : null
            }
            footer={
              <>
                <AlertDialogPrimitive.Close
                  ref={cancelRef}
                  disabled={pending}
                  render={<Button variant="ghost">{cancelLabel}</Button>}
                />
                <Button
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  disabled={!armed}
                  loading={pending}
                  aria-describedby={showError ? errorId : undefined}
                  onClick={confirm}
                >
                  {confirmLabel}
                </Button>
              </>
            }
          >
            {confirmationText !== undefined ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void confirm()
                }}
              >
                <label htmlFor={inputId} className="mb-2 block text-sm text-ink-2">
                  Type <code className="literal bg-ink-soft px-1 py-0.5 text-ink">{confirmationText}</code> to confirm.
                </label>
                <input
                  id={inputId}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={pending}
                  // The shared field classes, so it hovers, focuses and states
                  // `pending` like every other input. The band follows the
                  // dialog's tone: rojo only when the seam above is rojo.
                  className={cn(
                    fieldControlClasses,
                    fieldControlSizes.md,
                    'literal',
                    tone === 'danger' ? 'band-rojo' : 'band-oro',
                  )}
                />
              </form>
            ) : null}
          </DialogFrame>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
