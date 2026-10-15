'use client'

import { useDirection } from '@base-ui/react/direction-provider'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { Button, IconButton } from '../button'
import { useHotkeys } from '../shortcuts/use-hotkeys'
import { type ToastMessages, toastMessages } from './messages'

/**
 * Something happened somewhere other than where the operator is looking.
 *
 * A toast is a floating surface — raised cloth, ink keyline, the one blur —
 * and its tone is carried by a single cut square of the layer colour beside
 * the title, never by tinting the whole card. Four toasts stacked in four
 * washes is a fruit bowl; four cloth cards with four small marks is a list
 * the eye can still read in order. The mark is also never the only signal:
 * every tone has words, and `danger` is announced assertively.
 *
 * ── the running toast ──
 * The case an AI platform actually has and a generic toast library does not:
 * "Re-indexing 1,204 documents" takes four minutes and the operator leaves
 * the page. `toast.running()` opens a toast that does not time out, carries
 * the working relleno along its foot, and returns an id; `toast.update(id,
 * …)` turns that same card into the success or failure in place, so the
 * result lands where the operator last saw the work rather than as a second,
 * unrelated card.
 *
 * Stacking, swipe-to-dismiss, hover-to-expand, pause-on-hover, the live
 * region and focus handling (F6 jumps to the toast region) are Base UI's.
 */

/**
 * The status tones every `tone` prop uses, minus `accent` (a toast is never
 * an emphasis, only a report), plus `running`: the one toast that is work
 * still happening, which `update()` turns into a result.
 */
export type ToastTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'running'

export interface ToastOptions {
  title: React.ReactNode
  description?: React.ReactNode
  tone?: ToastTone
  /** A single follow-up — "Undo", "View run". Two actions belong in a dialog. */
  action?: { label: string; onClick: () => void }
  /** ms before auto-dismiss; 0 keeps it until dismissed. Running toasts default to 0. */
  timeout?: number
  id?: string
}

const MARK: Record<ToastTone, string> = {
  neutral: 'bg-ink',
  success: 'bg-verde',
  danger: 'bg-danger',
  warn: 'bg-oro cut-thin',
  info: 'bg-anil',
  running: 'bg-oro animate-mola-pulse',
}

// Read before the title, so a toast's tone is not colour alone. Neutral and
// info need no word: they are the ordinary case.
const SR_TONE: Record<ToastTone, keyof ToastMessages | null> = {
  neutral: null,
  success: 'success',
  danger: 'danger',
  warn: 'warn',
  info: null,
  running: 'running',
}

function toManagerOptions({ title, description, tone = 'neutral', action, timeout, id }: ToastOptions) {
  return {
    id,
    title,
    description,
    type: tone,
    timeout: timeout ?? (tone === 'running' ? 0 : undefined),
    priority: tone === 'danger' ? ('high' as const) : ('low' as const),
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  }
}

/**
 * The toast API. Call from anywhere inside a `ToastProvider`.
 *
 *   const toast = useToast()
 *   const id = toast.running({ title: 'Re-indexing 1,204 documents' })
 *   …
 *   toast.update(id, { tone: 'success', title: 'Index rebuilt' })
 */
export function useToast() {
  const manager = ToastPrimitive.useToastManager()
  return React.useMemo(() => {
    const show = (options: ToastOptions) => manager.add(toManagerOptions(options))
    const withTone = (tone: ToastTone) => (options: Omit<ToastOptions, 'tone'>) => show({ ...options, tone })
    return {
      show,
      success: withTone('success'),
      danger: withTone('danger'),
      /** The same as `danger`, under the word people reach for first. */
      error: withTone('danger'),
      warn: withTone('warn'),
      info: withTone('info'),
      running: withTone('running'),
      /**
       * Re-tone and re-word an existing toast in place. A running toast that
       * becomes a result starts the provider's timeout.
       *
       * Why `timeout` is sent as an explicitly present `undefined` rather than
       * a number: Base UI falls back to the provider's `timeout` only when the
       * toast's own is undefined, and the running toast stored 0. This used to
       * send a hard-coded 5000, so a provider set to 8000 still dismissed the
       * result after 5s. It also always sent the key, so re-wording a running
       * toast ("812 of 1,204 documents") cleared its 0 and started it timing
       * out mid-task. The key is now sent only when the tone or the timeout
       * changes.
       */
      update: (id: string, options: Partial<ToastOptions>) => {
        const next = toManagerOptions({ title: undefined, ...options })
        const timeoutChange =
          options.timeout !== undefined
            ? { timeout: options.timeout }
            : options.tone !== undefined
              ? { timeout: options.tone === 'running' ? 0 : undefined }
              : {}
        manager.update(id, {
          ...(options.title !== undefined && { title: next.title }),
          ...(options.description !== undefined && { description: next.description }),
          ...(options.tone !== undefined && { type: next.type, priority: next.priority }),
          ...(options.action !== undefined && { actionProps: next.actionProps }),
          ...timeoutChange,
        })
      },
      dismiss: (id?: string) => manager.close(id),
    }
  }, [manager])
}

export interface ToastProviderProps {
  children: React.ReactNode
  /** Toasts kept visible at once; older ones fold away. */
  limit?: number
  /** Default auto-dismiss, ms. Also the timeout a running toast starts when `update()` turns it into a result. */
  timeout?: number
  /**
   * Words for translation: the close button and the tone words read before a
   * title. Keys left out come from `MessagesProvider`, then English. The
   * toasts render here, so a `MessagesProvider` must sit above this one, not
   * inside it.
   */
  messages?: MessagesOverride<ToastMessages>
}

/**
 * Mount once near the root, inside `MessagesProvider` if the app has one.
 * Renders the viewport, bottom-right, into a portal.
 *
 * Inside a `HotkeysProvider` it lists F6, the key Base UI binds to move focus
 * to the stack, in the shortcuts dialog. Listed, not bound: Base UI already
 * listens for it, and a second listener would move focus twice.
 */
export function ToastProvider({ children, limit = 3, timeout = 5000, messages }: ToastProviderProps) {
  const [t] = useMessages('toast', toastMessages, messages)
  useHotkeys('f6', null, { label: t.focusShortcut })
  return (
    <ToastPrimitive.Provider limit={limit} timeout={timeout}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed inset-e-4 bottom-4 z-(--z-toast) w-[calc(100vw-2rem)] outline-none sm:inset-e-6 sm:bottom-6 sm:w-[24rem]">
          <ToastList messages={messages} />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

/**
 * The stack. The transform arithmetic is Base UI's documented recipe: each
 * toast behind the front one peeks 10px and shrinks 6%; hovering or focusing
 * the region fans them out by their real heights. Exit slides down off the
 * edge, or out in the direction it was swiped.
 */
const stackClasses = [
  '[--gap:0.625rem] [--peek:0.625rem]',
  '[--scale:calc(max(0,1-(var(--toast-index)*0.06)))] [--shrink:calc(1-var(--scale))]',
  '[--height:var(--toast-frontmost-height,var(--toast-height))]',
  '[--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]',
  'absolute inset-e-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none',
  '[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
  'h-(--height) data-expanded:h-(--toast-height)',
  'data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
  // The gap between expanded toasts is part of the hover target, so the
  // stack does not collapse as the pointer crosses it.
  "after:absolute after:top-full after:inset-s-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
  'data-starting-style:[transform:translateY(150%)]',
  '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
  'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
  'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
  'data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
  'data-ending-style:opacity-0 data-limited:opacity-0',
  '[transition:transform_var(--motion-slow)_var(--ease-cut),opacity_var(--motion-base),height_var(--motion-cut)]',
]

function ToastList({ messages }: { messages: MessagesOverride<ToastMessages> | undefined }) {
  const { toasts } = ToastPrimitive.useToastManager()
  const [t] = useMessages('toast', toastMessages, messages)
  // The stack sits at the inline end, so it is dismissed by swiping toward
  // that edge: right in LTR, left in RTL. Never across the page.
  const swipeDirection: ('left' | 'right' | 'down')[] = useDirection() === 'rtl' ? ['left', 'down'] : ['right', 'down']
  return toasts.map((toast) => {
    const tone = (toast.type ?? 'neutral') as ToastTone
    const word = SR_TONE[tone]
    return (
      <ToastPrimitive.Root
        key={toast.id}
        toast={toast}
        swipeDirection={swipeDirection}
        // A danger toast is high priority, and Base UI announces it with a
        // hidden `role="alert"` of its own — while the viewport, a polite live
        // region, read the same card again as it was added. Opting the card out
        // of the viewport's region leaves one announcement, the assertive one.
        aria-live={toast.priority === 'high' ? 'off' : undefined}
        data-slot="toast"
        // The toast itself is a tab stop (Base UI), and it showed no focus:
        // the floating shadow was its only edge. Found by the hard-states story.
        className={cn(stackClasses, 'bg-cloth-pale text-ink shadow-floating outline-none focus-visible:focus-ring')}
      >
        <ToastPrimitive.Content className="flex h-full items-start gap-3 overflow-hidden py-3 pe-2 ps-4 transition-opacity duration-(--motion-base) data-behind:opacity-0 data-expanded:opacity-100">
          <span aria-hidden className={cn('mt-[5px] size-2.5 shrink-0', MARK[tone])} />
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title className="m-0 font-ui text-sm font-semibold leading-snug">
              {word ? <span className="sr-only">{t[word]}{' '}</span> : null}
              {toast.title}
            </ToastPrimitive.Title>
            <ToastPrimitive.Description className="mt-0.5 mb-0 text-sm text-ink-2 empty:hidden" />
            {toast.actionProps ? (
              <ToastPrimitive.Action render={<Button variant="secondary" size="sm" className="mt-2.5" />} />
            ) : null}
          </div>
          {/* Always in the accessibility tree. Base UI hides the close button
              (`aria-hidden`) until the stack is expanded or the button has
              focus, for stacks whose close appears only on hover. Ours is
              drawn at all times, so a sighted user saw "Dismiss" on the front
              toast that a screen reader in browse mode, or a test looking it
              up by role, could not find until focus was already inside the
              region. The toast's title was never hidden, so a toast behind
              the front one now has both, the same as the front one. */}
          <ToastPrimitive.Close
            aria-hidden={false}
            render={
              <IconButton label={t.dismiss} variant="ghost" size="sm">
                <X />
              </IconButton>
            }
          />
        </ToastPrimitive.Content>
        {tone === 'running' ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-(--bar-w) band-accent relleno-working" />
        ) : null}
      </ToastPrimitive.Root>
    )
  })
}
