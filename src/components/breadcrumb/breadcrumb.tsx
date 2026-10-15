'use client'

import { useRender } from '@base-ui/react/use-render'
import type * as React from 'react'

import { cn } from '../../lib/cn'
import { type MessagesOverride, useMessages } from '../../lib/messages'
import { type BreadcrumbMessages, breadcrumbMessages } from './messages'

/**
 * Where this page sits — Workspace / Agents / knowledge-agent / Run #4182.
 *
 * A `<nav>` landmark named "Breadcrumb" holding an ordered list, with the
 * current page as plain text carrying `aria-current="page"`: the last crumb
 * is where you are, and a link to where you already are is a control that
 * does nothing.
 *
 * The separator is a slanted keyline rule, drawn with CSS rather than written
 * into the list, so a screen reader reads four places and not four places and
 * three slashes. It was a `/` glyph in `content`, coloured `text-keyline`, and
 * that was wrong twice: generated text is in the accessibility tree, so
 * browsers did read the slashes, and it set the decorative keyline (1.43:1)
 * as a text colour, outside its scope (src/tokens/scopes.ts). An empty box
 * filled with the keyline is a rule in both senses; `forced-ink` keeps it
 * visible in forced colours, where a background would otherwise be dropped.
 * Links are ink-2 and underline on hover — in a system where
 * colour is a field rather than an accent, a crumb that only changes hue would
 * be invisible to a third of the people who can't tell rojo from ink-2.
 *
 * Long ids collapse in the middle, not at the end: `run_8f3a…c21e` keeps both
 * ends, which are the parts people compare.
 *
 * Router-agnostic: `renderLink` is a Base UI render prop, as `NavItem`'s
 * `render` is — an element (`<Link />`, which receives `href`, the classes
 * and the label) or a function that returns one
 * (`(props) => <Link {...props} to={props.href} />` for React Router). It
 * was a callback of its own shape; the element form is new, and the
 * function form still receives `href`, `className` and `children`.
 */

export interface BreadcrumbItem {
  label: React.ReactNode
  /** Omit on the current page. */
  href?: string
}

export interface BreadcrumbProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  /**
   * The trail, root first. The last item is the current page and renders as
   * text whether or not it has an `href`; pass a long id through
   * `middleTruncate` so both ends survive.
   */
  items: BreadcrumbItem[]
  /** The element each link crumb renders as: your router's `<Link />`, or a function returning one. */
  renderLink?: BreadcrumbLinkRender
  /** Words for translation: the landmark's name. Keys left out come from `MessagesProvider`, then English. `aria-label` still wins. */
  messages?: MessagesOverride<BreadcrumbMessages>
}

/** Base UI's render prop, with the anchor props a crumb link receives. */
export type BreadcrumbLinkRender =
  | React.ReactElement
  | ((props: React.ComponentProps<'a'> & { href: string; className: string }) => React.ReactElement)

// At least 24px tall (WCAG 2.5.8): a wrapped trail stacks its links 4px apart.
// The negative margin keeps the line where it was, so the target grows
// without moving the page header under it.
const linkClasses =
  '-my-[3px] inline-flex min-h-[24px] items-center text-ink-2 no-underline decoration-ink-muted hover:text-ink hover:underline focus-visible:focus-ring focus-visible:outline-none'

export function Breadcrumb({ items, renderLink, messages, className, ...props }: BreadcrumbProps) {
  const [t] = useMessages('breadcrumb', breadcrumbMessages, messages)
  return (
    <nav aria-label={t.label} data-slot="breadcrumb" className={cn('min-w-0', className)} {...props}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 font-ui text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li
              key={i}
              className={cn(
                'flex min-w-0 items-center gap-2',
                i > 0 && "before:h-[0.9em] before:w-px before:shrink-0 before:rotate-[20deg] before:bg-keyline before:forced-ink before:content-['']",
              )}
            >
              {item.href && !last ? (
                <CrumbLink href={item.href} render={renderLink}>
                  {item.label}
                </CrumbLink>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn('truncate', last ? 'font-semibold text-ink' : 'text-ink-muted')}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CrumbLink({ href, render, children }: { href: string; render: BreadcrumbLinkRender | undefined; children: React.ReactNode }) {
  // The cast widens the function form's props to what Base UI declares; it
  // always passes the props given here, so `href` and `className` are there.
  return useRender({ defaultTagName: 'a', render: render as useRender.RenderProp | undefined, props: { href, className: linkClasses, children } })
}

/** `run_8f3a2b91c21e` → `run_8f3a…c21e`. Both ends survive; the middle is what nobody reads. */
export function middleTruncate(text: string, max = 14): string {
  if (text.length <= max) return text
  const keep = max - 1
  const head = Math.ceil(keep / 2)
  const tail = Math.floor(keep / 2)
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`
}
