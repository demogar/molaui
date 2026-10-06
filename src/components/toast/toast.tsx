'use client'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { Button, IconButton } from '../button'

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

export type ToastTone = 'neutral' | 'success' | 'danger' | 'info' | 'running'

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
  danger: 'bg-rojo',
  info: 'bg-anil',
  running: 'bg-oro animate-mola-pulse',
}

const SR_TONE: Record<ToastTone, string | null> = {
  neutral: null,
  success: 'Success: ',
  danger: 'Error: ',
  info: null,
  running: 'In progress: ',
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
      error: withTone('danger'),
      info: withTone('info'),
      running: withTone('running'),
      /** Re-tone and re-word an existing toast in place. A running toast that becomes a result starts its timeout. */
      update: (id: string, options: Partial<ToastOptions>) => {
        const next = toManagerOptions({ title: undefined, ...options })
        manager.update(id, {
          ...(options.title !== undefined && { title: next.title }),
          ...(options.description !== undefined && { description: next.description }),
          ...(options.tone !== undefined && { type: next.type, priority: next.priority }),
          ...(options.action !== undefined && { actionProps: next.actionProps }),
          timeout: options.timeout ?? (options.tone && options.tone !== 'running' ? 5000 : undefined),
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
  /** Default auto-dismiss, ms. */
  timeout?: number
}

/** Mount once near the root. Renders the viewport, bottom-right, into a portal. */
export function ToastProvider({ children, limit = 3, timeout = 5000 }: ToastProviderProps) {
  return (
    <ToastPrimitive.Provider limit={limit} timeout={timeout}>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[60] w-[calc(100vw-2rem)] outline-none sm:right-6 sm:bottom-6 sm:w-[24rem]">
          <ToastList />
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
  'absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none',
  '[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
  'h-(--height) data-expanded:h-(--toast-height)',
  'data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
  // The gap between expanded toasts is part of the hover target, so the
  // stack does not collapse as the pointer crosses it.
  "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
  'data-starting-style:[transform:translateY(150%)]',
  '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
  'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
  'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
  'data-ending-style:opacity-0 data-limited:opacity-0',
  '[transition:transform_var(--motion-slow)_var(--ease-cut),opacity_var(--motion-base),height_var(--motion-cut)]',
]

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((toast) => {
    const tone = (toast.type ?? 'neutral') as ToastTone
    return (
      <ToastPrimitive.Root
        key={toast.id}
        toast={toast}
        swipeDirection={['right', 'down']}
        data-slot="toast"
        className={cn(stackClasses, 'bg-cloth-pale text-ink shadow-floating')}
      >
        <ToastPrimitive.Content className="flex h-full items-start gap-3 overflow-hidden py-3 pr-2 pl-4 transition-opacity duration-(--motion-base) data-behind:opacity-0 data-expanded:opacity-100">
          <span aria-hidden className={cn('mt-[5px] size-2.5 shrink-0', MARK[tone])} />
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title className="m-0 font-ui text-sm font-semibold leading-snug">
              {SR_TONE[tone] ? <span className="sr-only">{SR_TONE[tone]}</span> : null}
              {toast.title}
            </ToastPrimitive.Title>
            <ToastPrimitive.Description className="mt-0.5 mb-0 text-sm text-ink-2 empty:hidden" />
            {toast.actionProps ? (
              <ToastPrimitive.Action render={<Button variant="secondary" size="sm" className="mt-2.5" />} />
            ) : null}
          </div>
          <ToastPrimitive.Close
            render={
              <IconButton label="Dismiss" variant="ghost" size="sm">
                <X />
              </IconButton>
            }
          />
        </ToastPrimitive.Content>
        {tone === 'running' ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] band-oro relleno-working" />
        ) : null}
      </ToastPrimitive.Root>
    )
  })
}
