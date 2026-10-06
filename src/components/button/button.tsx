import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A button is a cut shape, so its edge is a `box-shadow` keyline rather than a
 * `border`. The signature hover reveals a band of the layer beneath the shape,
 * which means the edge has to grow by several pixels without moving anything
 * around it. A border would reflow the toolbar; a shadow does not.
 *
 * ── why primary is ink, not red ──
 * The editorial system this was extracted from used rojo for its primary CTA:
 * a travel guide has one call to action per screen and it should be loud. An
 * internal tool has a primary action in every panel, and an operator who sees
 * red forty times a day stops reading red — which is the one colour that has
 * to keep meaning "this destroys something". So the product primary is the
 * top layer itself, ink, revealing gold when it is about to be cut; and red is
 * `danger`. See docs/adr/0002-primary-is-ink.md.
 *
 * `--cut-reveal` is narrowed to 3px from the system's 5px: two adjacent
 * buttons in a `gap-2` toolbar would otherwise have their revealed bands
 * touch, and two shapes cut from the same layer never share an edge.
 *
 * Height and horizontal padding come from the density tokens, so a button in a
 * compact table toolbar and one in a spacious form are the same component with
 * no size prop changed.
 */
export const buttonVariants = cva(
  [
    'group/button relative isolate inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-none [--cut-reveal:3px] select-none',
    'font-ui font-semibold uppercase leading-none tracking-label wdth-label',
    'transition-[background-color,box-shadow,color] duration-(--motion-cut) ease-cut',
    'focus-visible:shadow-[var(--focus-ring)]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Not `opacity-50`: fading a cut shape fades its keyline with it, and its
    // label lands near 2:1 — which axe never reports, because disabled
    // controls are exempt. Stated instead: shade field, muted ink, keyline kept.
    'data-disabled:pointer-events-none data-disabled:bg-cloth-shade data-disabled:text-ink-muted',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-ink text-on-ink band-oro shadow-cut',
          'hover:cut-band',
          'data-disabled:shadow-cut',
        ],
        secondary: [
          'bg-cloth-pale text-ink band-oro shadow-cut',
          'hover:cut-band',
          'data-disabled:shadow-cut',
        ],
        danger: [
          'bg-rojo text-on-layer band-rojo shadow-cut',
          'hover:bg-rojo-deep hover:cut-band',
          'data-disabled:shadow-cut',
        ],
        // Ghost has no keyline to keep, so disabled leaves the ground alone and
        // only the ink changes; a shade fill would invent an edge.
        ghost: [
          'bg-transparent text-ink shadow-none',
          'hover:bg-ink-soft',
          'data-disabled:bg-transparent',
        ],
      },
      size: {
        sm: 'h-(--control-h-sm) px-[calc(var(--control-px)*0.75)] text-2xs [&_svg]:size-3.5',
        md: 'h-(--control-h) px-(--control-px) text-xs [&_svg]:size-4',
        lg: 'h-(--control-h-lg) px-[calc(var(--control-px)*1.4)] text-sm [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends Omit<ButtonPrimitive.Props, 'className'>,
    VariantProps<typeof buttonVariants> {
  className?: string
  /** Trailing arrow that slides 3px on hover — for actions that move you somewhere. */
  withArrow?: boolean
  /**
   * Work is in flight. The label stays (so the button never changes width
   * mid-click), a strip of working relleno runs along its foot, and the button
   * stops accepting presses while staying focusable and announced as busy.
   */
  loading?: boolean
  /** Leading icon. Decorative: the label is the accessible name. */
  icon?: React.ReactNode
}

export function Button({
  className,
  variant,
  size,
  withArrow = false,
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      // Loading keeps focus where it was: a button that blurs itself the
      // moment it is pressed throws a keyboard user back to the top.
      focusableWhenDisabled={loading}
      className={cn(
        buttonVariants({ variant, size }),
        loading && 'data-disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      {icon ? <span aria-hidden className="contents">{icon}</span> : null}
      {children}
      {withArrow ? <ButtonArrow /> : null}
      {loading ? (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] band-oro relleno-working" />
      ) : null}
    </ButtonPrimitive>
  )
}

/** The arrow micro-interaction, exported so a router `<Link>` styled with `buttonVariants` gets the same one. */
export function ButtonArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="transition-transform duration-(--motion-cut) ease-cut group-hover/button:translate-x-[3px]"
    />
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'withArrow' | 'icon'> {
  /** The accessible name. Required: an icon is not a label. */
  label: string
  children: React.ReactNode
}

/**
 * A square button that carries only an icon. `label` is required and becomes
 * the accessible name and the native tooltip, because an icon-only control
 * with no name is the single most common accessibility failure in tool UIs.
 */
export function IconButton({ label, className, size, children, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      size={size}
      className={cn(
        'px-0',
        size === 'sm' ? 'w-(--control-h-sm)' : size === 'lg' ? 'w-(--control-h-lg)' : 'w-(--control-h)',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="contents">
        {children}
      </span>
    </Button>
  )
}
