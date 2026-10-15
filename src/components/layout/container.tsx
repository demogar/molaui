import { cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { deprecate } from '../../lib/deprecate'
import { type Variants } from '../../lib/variants'

/**
 * The page column. `page` is the editorial width the system was born at;
 * `wide` is for tools, where a table with twelve columns deserves the screen;
 * `prose` is the reading measure and never widens.
 *
 * Gutters are 16 / 24 / 36px: Tailwind's 4 / 6 / 9, so they move with density.
 *
 * The prop was `size` until 0.7.0; these are measures, not the t-shirt
 * scale `size` names everywhere else, so it is `width`.
 */
export const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-9', {
  variants: {
    width: {
      page: 'max-w-page',
      wide: 'max-w-wide',
      prose: 'max-w-reading',
      full: 'max-w-none',
    },
  },
  defaultVariants: { width: 'page' },
})

export type ContainerWidth = NonNullable<Variants<typeof containerVariants>['width']>

export interface ContainerProps extends Omit<React.ComponentProps<'div'>, 'width'>, Variants<typeof containerVariants> {
  /**
   * @deprecated Since 0.7.0; removed in 1.0.0. Use `width`, which takes the
   * same values. `codemods/prop-vocabulary.ts` rewrites call sites.
   */
  size?: ContainerWidth
}

export function Container({ className, width, size, ...props }: ContainerProps) {
  if (size !== undefined) deprecate('container-size', { what: '<Container size>', instead: '<Container width>', removal: '1.0.0' })
  return <div data-slot="container" className={cn(containerVariants({ width: width ?? size }), className)} {...props} />
}
