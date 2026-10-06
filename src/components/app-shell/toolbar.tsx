'use client'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { buttonVariants } from '../button'

/**
 * A row of related controls with `role="toolbar"` and one tab stop: Tab
 * enters the toolbar, the arrow keys move inside it, Tab leaves. In a dense
 * tool a table header can carry ten controls, and ten tab stops between the
 * page title and the first row is a keyboard user's afternoon.
 *
 * Groups are separated by a keyline, not by extra space. Space alone between
 * groups of identical ghost buttons reads as uneven spacing, not as grouping.
 */
const toolbarVariants = cva('flex flex-wrap items-center gap-1', {
  variants: {
    variant: {
      /** Its own cut panel, for a toolbar that stands alone over a canvas. */
      panel: 'bg-cloth-pale p-1 shadow-cut',
      /** No ground, for a toolbar inside a header or a table frame. */
      bare: '',
    },
  },
  defaultVariants: { variant: 'bare' },
})

export interface ToolbarProps
  extends Omit<ToolbarPrimitive.Root.Props, 'className'>,
    VariantProps<typeof toolbarVariants> {
  className?: string
  /** Names the toolbar: "Run actions", "Text formatting". */
  'aria-label': string
}

export function Toolbar({ variant, className, ...props }: ToolbarProps) {
  return <ToolbarPrimitive.Root data-slot="toolbar" className={cn(toolbarVariants({ variant }), className)} {...props} />
}

export function ToolbarGroup({ className, ...props }: Omit<ToolbarPrimitive.Group.Props, 'className'> & { className?: string }) {
  return <ToolbarPrimitive.Group className={cn('flex items-center gap-1', className)} {...props} />
}

export function ToolbarSeparator({ className }: { className?: string }) {
  return (
    <ToolbarPrimitive.Separator
      className={cn('mx-1 h-5 w-px self-center bg-keyline data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-5', className)}
    />
  )
}

export interface ToolbarButtonProps
  extends Omit<ToolbarPrimitive.Button.Props, 'className'>,
    VariantProps<typeof buttonVariants> {
  className?: string
  icon?: React.ReactNode
}

/** A Button that takes part in the toolbar's arrow-key focus. Ghost and small by default. */
export function ToolbarButton({
  variant = 'ghost',
  size = 'sm',
  icon,
  className,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <ToolbarPrimitive.Button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon ? <span aria-hidden className="contents">{icon}</span> : null}
      {children}
    </ToolbarPrimitive.Button>
  )
}
