import { Check, X } from 'lucide-react'

import { type Alternative, USAGE, type Usage } from '../usage/guidance'
import { storyHref } from '../usage/links'

/** The last segment of a stories title, which is the name a reader knows it by. */
export function titleName(title: string) {
  return title.split('/').at(-1) ?? title
}

function AlternativeLink({ alt }: { alt: Alternative }) {
  if (!alt.use) return null
  return (
    <>
      {' '}
      Use{' '}
      <a href={storyHref(alt.use)} target="_top" className="font-semibold text-ink underline underline-offset-2">
        {alt.label ?? titleName(alt.use)}
      </a>
      .
    </>
  )
}

/**
 * The Usage section of a component's docs page, from USAGE.
 *
 * Do and don't are set as a pair, side by side, each with its glyph and word
 * as well as its tone — the system's own rule that state is never colour
 * alone applies to its documentation too.
 */
export function UsageGuide({ usage }: { usage: Usage }) {
  return (
    <section className="sb-unstyled not-prose my-8 grid gap-6 font-ui text-sm text-ink">
      <h2 className="m-0 text-xl font-bold text-ink">Usage</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="m-0 rotulo text-ink-muted">When to use</h3>
          <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
            {usage.use.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-2">
          <h3 className="m-0 rotulo text-ink-muted">When not to</h3>
          <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
            {usage.avoid.map((alt) => (
              <li key={alt.when}>
                {alt.when}
                <AlternativeLink alt={alt} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {usage.practices?.length ? (
        <div className="grid gap-3">
          {usage.practices.map((pair) => (
            <div key={pair.do} className="grid gap-3 md:grid-cols-2">
              <p className="m-0 flex gap-2 bg-cloth-pale p-3 border-t-[3px] border-success">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} />
                <span>
                  <strong className="font-semibold">Do.</strong> {pair.do}
                </span>
              </p>
              <p className="m-0 flex gap-2 bg-cloth-pale p-3 border-t-[3px] border-danger">
                <X aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2.5} />
                <span>
                  <strong className="font-semibold">Don’t.</strong> {pair.dont}
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {usage.content?.length ? (
        <div className="grid gap-2">
          <h3 className="m-0 rotulo text-ink-muted">Content</h3>
          <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
            {usage.content.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

/** Looks a title up in USAGE; renders nothing for a page with no entry (a showcase or a pattern). */
export function UsageFor({ title }: { title: string }) {
  const usage = USAGE[title]
  return usage ? <UsageGuide usage={usage} /> : null
}
