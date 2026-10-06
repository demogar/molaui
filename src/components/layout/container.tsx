import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The page column. `page` is the editorial width the system was born at;
 * `wide` is for tools, where a table with twelve columns deserves the screen;
 * `prose` is the reading measure and never widens.
 *
 * Gutters are 16 / 24 / 36px: Tailwind's 4 / 6 / 9, so they move with density.
 */
export const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-9', {
  variants: {
    size: {
      page: 'max-w-page',
      wide: 'max-w-wide',
      prose: 'max-w-prose',
      full: 'max-w-none',
    },
  },
  defaultVariants: { size: 'page' },
})

export interface ContainerProps extends React.ComponentProps<'div'>, VariantProps<typeof containerVariants> {}

export function Container({ className, size, ...props }: ContainerProps) {
  return <div className={cn(containerVariants({ size }), className)} {...props} />
}
