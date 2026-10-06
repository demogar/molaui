import type * as React from 'react'

import { cn } from '../../lib/cn'
import { Heading } from '../typography/heading'
import { Lead } from '../typography/lead'
import { Rotulo } from '../typography/rotulo'

export interface SectionProps extends React.ComponentProps<'section'> {
  /** A keyline between this section and the one above it. */
  divided?: boolean
  /** `page` is the editorial 56/80/112px rhythm; `panel` is the tool rhythm. */
  rhythm?: 'page' | 'panel'
}

export function Section({ divided = false, rhythm = 'panel', className, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        rhythm === 'page' ? 'py-14 sm:py-20 lg:py-28' : 'py-8 sm:py-10',
        divided && 'border-t border-keyline',
        className,
      )}
      {...props}
    />
  )
}

export interface SectionHeaderProps {
  title: React.ReactNode
  lead?: React.ReactNode
  /**
   * The section's label. It renders UNDER the heading, not above it: a small
   * label above a heading pre-announces what the heading is about to say
   * better. Below, the same string reads as what kind of section this is.
   */
  label?: string
  /** Actions, aligned to the heading's baseline on the right. */
  actions?: React.ReactNode
  level?: 1 | 2 | 3
  className?: string
}

export function SectionHeader({ title, lead, label, actions, level = 2, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="max-w-160 min-w-0">
        <Heading level={level}>{title}</Heading>
        {lead ? <Lead className="mt-3">{lead}</Lead> : null}
        {label ? <Rotulo className="mt-4">{label}</Rotulo> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
