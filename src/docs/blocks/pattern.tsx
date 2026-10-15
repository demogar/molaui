import { CircleDashed, Eye } from 'lucide-react'
import type * as React from 'react'

import { Badge } from '../../components/badge'
import { builtFromOf } from '../usage/composition-data'
import { storyHref, storyId } from '../usage/links'
import { PATTERN_STATES, type PatternStateId, PATTERNS } from '../usage/patterns'
import { titleName } from './usage'

/**
 * The guidance on a pattern's docs page, from patterns.ts and the generated
 * composition. A pattern page answers different questions from a component
 * page, in this order: what is it for and should I use it; what is it made
 * of; what does it look like when it has nothing, is waiting, has failed or
 * is not yours to see; and what does it do for someone on a keyboard or a
 * screen reader. The stories follow, then the accessibility notes.
 *
 * Every block carries `sb-unstyled`: Storybook's docs styles are unlayered
 * and would beat every Tailwind utility here.
 */

const linkClass = 'font-semibold text-ink underline underline-offset-2'
const cell = 'border-b border-keyline px-3 py-2 align-top text-start'

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="m-0 text-xl font-bold text-ink">{children}</h2>
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/** Summary, when to use, when not to, built from and states: everything above the stories. */
export function PatternGuide({ title }: { title: string }) {
  const pattern = PATTERNS[title]
  if (!pattern) return null
  const parts = builtFromOf(title)
  return (
    <div data-pattern-guide className="sb-unstyled not-prose font-ui text-sm text-ink">
      <p className="my-6 font-text text-lg leading-snug text-ink">{pattern.summary}</p>

      <section className="my-8 grid gap-6">
        <Heading>Usage</Heading>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <h3 className="m-0 rotulo text-ink-muted">When to use</h3>
            <Bullets items={pattern.use} />
          </div>
          <div className="grid content-start gap-2">
            <h3 className="m-0 rotulo text-ink-muted">When not to</h3>
            <Bullets
              items={pattern.avoid.map((alt) => (
                <>
                  {alt.when}
                  {alt.use ? (
                    <>
                      {' '}
                      Use{' '}
                      <a href={storyHref(alt.use)} target="_top" className={linkClass}>
                        {alt.label ?? titleName(alt.use)}
                      </a>
                      .
                    </>
                  ) : null}
                </>
              ))}
            />
          </div>
        </div>
      </section>

      <section data-built-from className="my-10 grid gap-3">
        <Heading>Built from</Heading>
        <p className="m-0 text-ink-2">
          Read from the screen’s imports, so the list cannot fall behind the code. Nothing in it was written for this
          screen.
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={`${cell} w-1/4 rotulo text-ink-muted`}>
                Component
              </th>
              <th scope="col" className={`${cell} rotulo text-ink-muted`}>
                Its job here
              </th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part}>
                <th scope="row" className={`${cell} font-semibold`}>
                  <a href={storyHref(part)} target="_top" className={linkClass}>
                    {titleName(part)}
                  </a>
                </th>
                <td className={`${cell} text-ink-2`}>{pattern.parts[part]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section data-states className="my-10 grid gap-3">
        <Heading>States</Heading>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={`${cell} w-1/4 rotulo text-ink-muted`}>
                State
              </th>
              <th scope="col" className={`${cell} w-1/5 rotulo text-ink-muted`}>
                Where
              </th>
              <th scope="col" className={`${cell} rotulo text-ink-muted`}>
                What the screen does
              </th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(PATTERN_STATES) as PatternStateId[]).map((id) => {
              const state = pattern.states[id]
              return (
                <tr key={id}>
                  <th scope="row" className={`${cell} font-semibold`}>
                    {PATTERN_STATES[id]}
                  </th>
                  <td className={cell}>
                    {state.story ? (
                      <a href={`?path=/story/${storyId(title, state.story)}`} target="_top" aria-label={`${PATTERN_STATES[id]} story`} className={linkClass}>
                        <Eye aria-hidden className="me-1 inline size-3.5 align-[-2px]" strokeWidth={2.5} />
                        Story
                      </a>
                    ) : (
                      // Only a state marked `applies: false` gets here: usage.test.ts
                      // fails any other state without a story.
                      <Badge tone="neutral" variant="soft">
                        <CircleDashed aria-hidden className="size-3.5" strokeWidth={2.5} />
                        Not applicable
                      </Badge>
                    )}
                  </td>
                  <td className={`${cell} text-ink-2`}>{state.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

/** The pattern's accessibility notes, after the stories, where a component page has its Accessibility section. */
export function PatternAccessibility({ title }: { title: string }) {
  const pattern = PATTERNS[title]
  if (!pattern) return null
  return (
    <section data-pattern-a11y className="sb-unstyled not-prose my-10 grid gap-3 font-ui text-sm text-ink">
      <Heading>Accessibility</Heading>
      <p className="m-0 text-ink-2">
        What the screen does on top of its parts. Each part’s own keyboard and screen-reader behaviour is on its page.
      </p>
      <Bullets items={pattern.accessibility} />
    </section>
  )
}
