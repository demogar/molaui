'use client'

import { useDirection } from '@base-ui/react/direction-provider'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { cva } from 'class-variance-authority'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { IconButton } from '../button'
import { actionRowClasses } from '../dialog/dialog'

/**
 * A panel that slides in from an edge of the page: the run details beside a
 * table, the filters for a list, the quick actions on a phone. It is a Dialog
 * in every way that matters for access — focus trap, scroll lock, Escape, the
 * inert page, the close button that is always there — and it says so in the
 * same visual language: the relleno seam along its top, the same title and
 * description faces, a backdrop that recedes toward cloth rather than grey.
 *
 * ── why Base UI Drawer, not a positioned Dialog ──
 * The app shell's mobile navigation is a positioned Dialog, and that is enough
 * for a panel nobody drags. A drawer is the panel people *do* drag: on a phone
 * the natural way to put a sheet away is to flick it back toward the edge it
 * came from, and a positioned Dialog cannot follow a finger. Base UI's Drawer
 * is Dialog underneath (every guarantee above comes from there) plus the
 * swipe-to-dismiss gesture, with the drag distance exposed as
 * `--drawer-swipe-movement-x/y` so the panel tracks the finger in CSS and the
 * backdrop fades with `--drawer-swipe-progress`.
 *
 * ── the side is logical, the swipe is not ──
 * `side` is `start`, `end` or `bottom`, so an end drawer opens from the right
 * in English and from the left in Arabic with no second prop. Base UI's
 * `swipeDirection` is physical (`left`/`right`), so it is computed here from
 * the side and `useDirection()`. Reading `dir` off the DOM was the first idea;
 * it is not known until after mount, and a drawer opened by default would
 * start with the wrong gesture. The DirectionProvider is already the system's
 * source of truth for behaviour (sliders, tabs, menus), so it is used here too.
 *
 * ── sizes stay a cap ──
 * Side widths are 20, 28 and 40rem, always capped at the viewport minus
 * 2.5rem. The strip of page left showing on a phone is the affordance: it says
 * "the page is still there" and is the obvious place to tap to go back. A
 * bottom sheet is full width up to a reading measure and takes its size as a
 * height, with a grab handle and the device's safe-area inset under the last
 * row so a home indicator never sits on a button.
 */

export type DrawerSide = 'start' | 'end' | 'bottom'
type SwipeDirection = 'up' | 'down' | 'left' | 'right'

const DrawerSideContext = React.createContext<DrawerSide>('end')

function swipeDirectionFor(side: DrawerSide, direction: 'ltr' | 'rtl'): SwipeDirection {
  if (side === 'bottom') return 'down'
  const towardRight = (side === 'end') === (direction === 'ltr')
  return towardRight ? 'right' : 'left'
}

export interface DrawerProps extends Omit<DrawerPrimitive.Root.Props, 'swipeDirection'> {
  /**
   * The edge the drawer slides in from. `start` and `end` are logical and
   * swap in right-to-left; the swipe that dismisses it follows. Defaults to
   * `end`, where a details panel beside a list belongs.
   */
  side?: DrawerSide
}

export function Drawer({ side = 'end', ...props }: DrawerProps) {
  const direction = useDirection()
  return (
    <DrawerSideContext.Provider value={side}>
      <DrawerPrimitive.Root swipeDirection={swipeDirectionFor(side, direction)} {...props} />
    </DrawerSideContext.Provider>
  )
}

export const DrawerTrigger = DrawerPrimitive.Trigger
export const DrawerClose = DrawerPrimitive.Close

const viewportVariants = cva('fixed inset-0 z-50 flex', {
  variants: {
    side: {
      start: 'items-stretch justify-start',
      end: 'items-stretch justify-end',
      bottom: 'items-end justify-center',
    },
  },
})

const drawerPopupVariants = cva(
  [
    'relative flex flex-col bg-cloth-pale text-ink rounded-none outline-none',
    'shadow-floating',
    // The finger's drag is a transform; the open/close slide is `translate`.
    // Two properties, so a release mid-drag slides on from where it was let go
    // instead of snapping back to zero first.
    '[transform:translate3d(var(--drawer-swipe-movement-x,0px),var(--drawer-swipe-movement-y,0px),0)]',
    'transition-[translate,transform] duration-(--motion-base) ease-cut',
    'data-swiping:duration-0 data-swiping:select-none',
    'data-ending-style:duration-(--motion-cut)',
  ],
  {
    variants: {
      side: {
        start: [
          'h-full max-w-[calc(100vw-2.5rem)]',
          'data-starting-style:-translate-x-full data-ending-style:-translate-x-full',
          'rtl:data-starting-style:translate-x-full rtl:data-ending-style:translate-x-full',
        ],
        end: [
          'h-full max-w-[calc(100vw-2.5rem)]',
          'data-starting-style:translate-x-full data-ending-style:translate-x-full',
          'rtl:data-starting-style:-translate-x-full rtl:data-ending-style:-translate-x-full',
        ],
        bottom: ['w-full max-w-3xl', 'data-starting-style:translate-y-full data-ending-style:translate-y-full'],
      },
      size: { sm: '', md: '', lg: '' },
    },
    compoundVariants: [
      { side: ['start', 'end'], size: 'sm', class: 'w-[20rem]' },
      { side: ['start', 'end'], size: 'md', class: 'w-[28rem]' },
      { side: ['start', 'end'], size: 'lg', class: 'w-[40rem]' },
      { side: 'bottom', size: 'sm', class: 'max-h-[45dvh]' },
      { side: 'bottom', size: 'md', class: 'max-h-[70dvh]' },
      { side: 'bottom', size: 'lg', class: 'max-h-[calc(100dvh-2.5rem)]' },
    ],
    defaultVariants: { side: 'end', size: 'md' },
  },
)

const backdropClasses = [
  'fixed inset-0 z-50 bg-backdrop',
  // Fades as the drawer is dragged away, so the page comes back with the finger.
  'opacity-[calc(1-var(--drawer-swipe-progress,0))]',
  'transition-opacity duration-(--motion-base) ease-cut',
  'data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0',
]

const bandClass = {
  oro: 'band-oro',
  rojo: 'band-rojo',
  anil: 'band-anil',
  verde: 'band-verde',
} as const
type Band = keyof typeof bandClass

const titleClasses = 'm-0 font-display text-xl font-bold leading-snug tracking-display wdth-display'
const descriptionClasses = 'mt-1.5 mb-0 text-sm text-ink-2'

export interface DrawerContentProps extends Omit<DrawerPrimitive.Popup.Props, 'className' | 'title'> {
  className?: string
  /** The drawer's accessible name. Required: an unnamed modal is announced as "dialog" and nothing else. */
  title: React.ReactNode
  description?: React.ReactNode
  /** Action row pinned under the scrolling body, behind a keyline. Usually a `ghost` cancel and one primary. */
  footer?: React.ReactNode
  /** Width of a side drawer, or height of a bottom sheet. Always capped by the viewport. */
  size?: 'sm' | 'md' | 'lg'
  /** The layer revealed in the top seam. */
  band?: Band
  /** Hide the close button. Only when the footer carries an explicit way out. */
  hideClose?: boolean
}

export function DrawerContent({
  className,
  size = 'md',
  title,
  description,
  footer,
  band = 'oro',
  hideClose = false,
  children,
  ...props
}: DrawerContentProps) {
  const side = React.useContext(DrawerSideContext)
  const bottom = side === 'bottom'
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className={cn(backdropClasses)} />
      <DrawerPrimitive.Viewport className={viewportVariants({ side })}>
        <DrawerPrimitive.Popup
          data-slot="drawer"
          data-side={side}
          className={cn(drawerPopupVariants({ side, size }), className)}
          {...props}
        >
          <div aria-hidden className={cn('relleno shrink-0', bandClass[band])} />
          {/* The handle is a picture of the gesture, not a control: the
              gesture's keyboard equivalent is Escape and the close button. */}
          {bottom ? <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 bg-ink-muted forced-ink" /> : null}
          <div
            className={cn(
              'flex shrink-0 items-start gap-4 px-6 pb-4',
              bottom ? 'pt-3' : 'pt-5',
              // Whichever row is last on a bottom sheet keeps clear of the home indicator.
              bottom && !children && !footer && 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
            )}
          >
            <div className="min-w-0 flex-1">
              <DrawerPrimitive.Title className={titleClasses}>{title}</DrawerPrimitive.Title>
              {description ? (
                <DrawerPrimitive.Description className={descriptionClasses}>{description}</DrawerPrimitive.Description>
              ) : null}
            </div>
            {hideClose ? null : (
              <div className="-mt-1 -me-2">
                <DrawerPrimitive.Close
                  render={
                    <IconButton label="Close" variant="ghost" size="sm">
                      <X />
                    </IconButton>
                  }
                />
              </div>
            )}
          </div>
          {/* Drawer.Content lets a mouse select text in the body without the
              selection being read as a swipe. */}
          {children ? (
            <DrawerPrimitive.Content
              className={cn(
                'scroll-cloth min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 text-sm',
                bottom && !footer && 'pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
              )}
            >
              {children}
            </DrawerPrimitive.Content>
          ) : null}
          {footer ? (
            <div
              className={cn(
                '@container mt-auto shrink-0 border-t border-keyline px-6 pt-4',
                bottom ? 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]' : 'pb-4',
              )}
            >
              <div className={cn(actionRowClasses)}>{footer}</div>
            </div>
          ) : null}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  )
}
