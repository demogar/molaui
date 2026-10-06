'use client'

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * A person, or an agent, as a square of cut cloth.
 *
 * Square because nothing in this system is round. Initials in Archivo at its
 * label width, because two letters on a tile are lettering, not text.
 *
 * The ground is one of the five layers, picked from the name by a stable hash:
 * the same person is the same colour on every screen, in every session,
 * without anyone storing a colour. Each pairing is the one tokens.css already
 * measured — cloth on rojo / añil / verde, ink on oro, cloth on ink — so no
 * initials ever fall under AA.
 *
 * The image goes through Base UI's Avatar, which only swaps the initials out
 * once the image has actually loaded: a broken URL leaves the initials in
 * place rather than a broken-image glyph inside a keyline.
 */

const LAYERS = [
  'bg-rojo text-on-layer',
  'bg-anil text-on-layer',
  'bg-verde text-on-layer',
  'bg-oro text-on-oro',
  'bg-ink text-on-ink',
] as const

/** FNV-1a: tiny, stable across engines, and good enough to spread names over five colours. */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function avatarLayer(name: string): (typeof LAYERS)[number] {
  return LAYERS[hash(name.trim().toLowerCase()) % LAYERS.length]!
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]!
  const last = words.length > 1 ? words.at(-1)! : ''
  return (first[0]! + (last[0] ?? first[1] ?? '')).toUpperCase()
}

export const avatarVariants = cva(
  'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-none shadow-cut select-none',
  {
    variants: {
      size: {
        xs: 'size-5 text-[9px]',
        sm: 'size-6 text-[10px]',
        md: 'size-8 text-2xs',
        lg: 'size-10 text-xs',
        xl: 'size-14 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface AvatarProps
  extends Omit<React.ComponentProps<'span'>, 'children'>,
    VariantProps<typeof avatarVariants> {
  /** The person's or agent's name. Becomes the accessible name and seeds the colour. */
  name: string
  src?: string
  /** Shown instead of initials when there is no image — e.g. a bot glyph for an agent. */
  icon?: React.ReactNode
}

export function Avatar({ name, src, icon, size, className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      role="img"
      aria-label={name}
      title={name}
      className={cn(avatarVariants({ size }), avatarLayer(name), className)}
      {...props}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback
        aria-hidden
        className="font-ui leading-none font-semibold tracking-[0.04em] wdth-label [&_svg]:size-[55%]"
      >
        {icon ?? initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export interface AvatarGroupProps extends React.ComponentProps<'div'> {
  /** Names the group: "Reviewers", "On call". */
  label: string
  /** Show at most this many; the rest collapse into a "+n" tile. */
  max?: number
  size?: AvatarProps['size']
}

/**
 * Overlapping tiles, each separated from the next by a ring of the page
 * ground inside its keyline — the gap a blade leaves between two shapes cut
 * from the same layer. Without it, overlapping squares merge into one shape
 * and the count is unreadable.
 */
export function AvatarGroup({ label, max = 4, size = 'md', className, children, ...props }: AvatarGroupProps) {
  const all = React.Children.toArray(children).filter(React.isValidElement)
  const shown = all.slice(0, max)
  const hidden = all.length - shown.length

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="avatar-group"
      className={cn(
        'flex items-center -space-x-1',
        '[&>[data-slot=avatar]]:shadow-[0_0_0_1.5px_var(--ink),0_0_0_3.5px_var(--cloth)]',
        className,
      )}
      {...props}
    >
      {shown.map((child) =>
        React.cloneElement(child as React.ReactElement<AvatarProps>, { size }),
      )}
      {hidden > 0 ? (
        <span
          data-slot="avatar"
          role="img"
          aria-label={`${hidden} more`}
          className={cn(avatarVariants({ size }), 'bg-cloth-shade font-semibold text-ink-2 tabular-nums')}
        >
          <span aria-hidden>+{hidden}</span>
        </span>
      ) : null}
    </div>
  )
}
