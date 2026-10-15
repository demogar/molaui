'use client'

import { useRender } from '@base-ui/react/use-render'
import { cva } from 'class-variance-authority'
import { ArrowUpRight } from 'lucide-react'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { type Variants } from '../../lib/variants'
import { ButtonArrow, buttonVariants } from '../button'
import { type LinkMessages, linkMessages } from './messages'

/**
 * A link: it goes somewhere. A button does something. The audit found
 * "use a link styled with `buttonVariants`" on three pages and no component
 * to do it with, so each caller rebuilt the classes, the arrow and the
 * new-tab cue, and most left the cue out.
 *
 * ── your router's link ──
 * Both render an `<a>`, and `render` swaps it for the app's own link —
 * `render={<NextLink href="/runs" />}`, or `render={(props) => <RouterLink
 * {...props} to="/runs" />}` — with the classes, `ref` and handlers merged
 * onto it, the Base UI render prop NavItem, Breadcrumb's `renderLink` and
 * Citation already take. There is no router dependency and no adapter to
 * register: the element you pass is the adapter.
 *
 * ── a new tab is said, not only drawn ──
 * `external` opens the link in a new tab with `rel="noopener noreferrer"`,
 * and so does `target="_blank"` passed directly. Either way the label gains
 * the up-right arrow, which mirrors in a right-to-left page, and a hidden
 * "(opens in a new tab)" from `messages.link.newTab`: a tab that opens
 * without warning strands a screen reader user, whose Back button no longer
 * works (WCAG 3.2.5). Sources wrote the same words by hand; this is the one
 * place they now live.
 */
export const linkVariants = cva(
  [
    'rounded-none focus-visible:focus-ring focus-visible:outline-none',
    '[&_svg]:pointer-events-none',
  ],
  {
    variants: {
      /**
       * `inline` sits in a sentence and is always underlined, because colour
       * alone cannot pick a link out of the words around it (WCAG 1.4.1). It
       * takes the font of the text it sits in. `standalone` stands on its own
       * ("View all runs" under a list) in the UI face, and underlines on hover:
       * its place says it is a link.
       */
      variant: {
        inline: 'text-ink underline decoration-ink-muted hover:decoration-current visited:text-ink-2',
        standalone: 'font-ui font-semibold text-ink no-underline hover:underline',
      },
    },
    defaultVariants: { variant: 'inline' },
  },
)

/** What Link and LinkButton share: opening a new tab, and saying so. */
export interface LinkExternalProps {
  /**
   * The link leaves the app: it opens in a new tab with `rel="noopener
   * noreferrer"`, marked by the up-right arrow and a hidden "(opens in a new
   * tab)". `target="_blank"` turns the same marks on.
   */
  external?: boolean
  /** Words for translation: the hidden new-tab cue. Keys left out come from `MessagesProvider`, then English. */
  messages?: MessagesOverride<LinkMessages>
}

export interface LinkProps extends Omit<useRender.ComponentProps<'a'>, 'className'>, Variants<typeof linkVariants>, LinkExternalProps {
  /** Classes for the link, merged with `cn()` so yours win a conflict. */
  className?: string
}

/** The props an external link adds, and the cue it reads after its label. */
function useExternal({ external, messages, target, rel }: LinkExternalProps & { target?: string; rel?: string }) {
  const [t] = useMessages('link', linkMessages, messages)
  const newTab = external === true || target === '_blank'
  return {
    newTab,
    props: newTab ? { target: '_blank', rel: rel ?? 'noopener noreferrer' } : { target, rel },
    cue: newTab ? (
      <>
        {' '}
        <span className="sr-only">{t.newTab}</span>
      </>
    ) : null,
  }
}

/**
 * Text that goes somewhere: in a sentence (`inline`, underlined) or on its
 * own (`standalone`). `className`, `ref` and the rest of the DOM props go to
 * the `<a>`, or to the element `render` returns.
 *
 * Visited links in `inline` turn ink-2. Browsers let `:visited` change only
 * colours, so it is a courtesy for reading a list of sources, never the one
 * way to tell anything apart.
 */
export function Link({ variant, external, messages, className, render, children, target, rel, ref, ...props }: LinkProps) {
  const outside = useExternal({ external, messages, target, rel })
  return useRender({
    defaultTagName: 'a',
    render,
    ref,
    props: {
      ...props,
      ...outside.props,
      'data-slot': 'link',
      className: cn(linkVariants({ variant }), className),
      children: (
        <>
          {children}
          {outside.newTab ? (
            <ArrowUpRight aria-hidden className="ms-0.5 inline size-(--icon-sm) align-[-0.1em] flip-rtl" strokeWidth={2.25} />
          ) : null}
          {outside.cue}
        </>
      ),
    },
  })
}

export interface LinkButtonProps
  extends Omit<useRender.ComponentProps<'a'>, 'className'>,
    Pick<Variants<typeof buttonVariants>, 'size'>,
    LinkExternalProps {
  /**
   * The weight of the way forward, as on Button. There is no `danger`: going
   * somewhere destroys nothing, and the rojo button keeps meaning that it does.
   */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Classes for the link, merged with `cn()` so yours win a conflict. */
  className?: string
  /** Trailing arrow that slides 3px on hover, as Button's does: for a link that moves you on in a flow. */
  withArrow?: boolean
  /** Leading icon. Decorative: the label is the accessible name. */
  icon?: React.ReactNode
}

/**
 * A link that looks like a button, for the main way forward that is a
 * navigation: "Open run", "Read the guide". It is still an `<a>`, so it opens
 * in a new tab on a middle click, shows its address on hover, and Space does
 * not press it. It has no `disabled`: a link cannot be disabled, so render a
 * `Button` that says why instead.
 *
 * `className`, `ref` and the rest of the DOM props go to the `<a>`, or to the
 * element `render` returns.
 */
export function LinkButton({
  variant,
  size,
  withArrow = false,
  icon,
  external,
  messages,
  className,
  render,
  children,
  target,
  rel,
  ref,
  ...props
}: LinkButtonProps) {
  const outside = useExternal({ external, messages, target, rel })
  return useRender({
    defaultTagName: 'a',
    render,
    ref,
    props: {
      ...props,
      ...outside.props,
      'data-slot': 'link-button',
      className: cn(buttonVariants({ variant, size }), 'no-underline', className),
      children: (
        <>
          {icon ? (
            <span aria-hidden className="contents">
              {icon}
            </span>
          ) : null}
          {children}
          {outside.newTab ? <ArrowUpRight aria-hidden className="flip-rtl" /> : withArrow ? <ButtonArrow /> : null}
          {outside.cue}
        </>
      ),
    },
  })
}
