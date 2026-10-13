import { Markdown } from '@storybook/addon-docs/blocks'
import { Ban, Check, CircleDashed } from 'lucide-react'

import { Badge, type BadgeTone } from '../../components/badge'
import { DECISIONS, decision, decisionsBehind, DECISIONS_INDEX, type Decision, type DecisionStatus } from '../decisions/decisions'
import { storyHref } from '../usage/links'
import { titleName } from './usage'

/**
 * The Decisions section: one page per ADR in docs/adr/, an index, and the
 * "why" note each foundation page carries. The records are rendered from the
 * Markdown files, not copied (see src/docs/decisions/decisions.ts).
 *
 * Every block carries `sb-unstyled` except the record's own Markdown, which
 * is left to Storybook's docs styles so a decision reads like the Changelog
 * and every other prose page.
 */

const STATUS_LOOK: Record<DecisionStatus, { tone: BadgeTone; Glyph: typeof Check; label: string }> = {
  accepted: { tone: 'success', Glyph: Check, label: 'Accepted' },
  proposed: { tone: 'warn', Glyph: CircleDashed, label: 'Proposed' },
  superseded: { tone: 'neutral', Glyph: Ban, label: 'Superseded' },
}

/** Glyph, word and tone, never the tone alone. */
export function DecisionStatusBadge({ status }: { status: DecisionStatus }) {
  const { tone, Glyph, label } = STATUS_LOOK[status]
  return (
    <Badge tone={tone} variant="soft" data-status={status}>
      <Glyph aria-hidden className="size-3.5" strokeWidth={2.5} />
      {label}
    </Badge>
  )
}

const link = 'font-semibold text-ink underline underline-offset-2'

function DecisionLink({ d }: { d: Decision }) {
  return (
    <a href={storyHref(d.page)} target="_top" className={link}>
      {d.number}{' '}
      {d.title.split(/`([^`]+)`/).map((part, i) =>
        i % 2 ? (
          <code key={i} className="literal">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </a>
  )
}

function Foundations({ d }: { d: Decision }) {
  const titles = Object.keys(d.governs)
  return (
    <>
      {titles.map((title, i) => (
        <span key={title}>
          {i > 0 ? ', ' : null}
          <a href={storyHref(title)} target="_top" className={link}>
            {titleName(title)}
          </a>
        </span>
      ))}
    </>
  )
}

/**
 * One decision record. Its heading and date line are read from the file and
 * set here, with the status as a badge, so the page opens with what the
 * reader needs first: is this still in force, and which foundation does it
 * govern. The rest of the record follows exactly as written.
 */
export function DecisionRecord({ number }: { number: string }) {
  const d = decision(number)
  return (
    <>
      <Markdown>{`# ${d.number} — ${d.title}`}</Markdown>
      <div className="sb-unstyled not-prose my-6 grid gap-3 bg-cloth-pale p-4 font-ui text-sm text-ink shadow-cut">
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="rotulo text-ink-muted">Status</span>
          <DecisionStatusBadge status={d.status} />
          <span className="text-ink-2">
            Decided <time dateTime={d.date}>{d.date}</time>
          </span>
        </p>
        <p className="m-0 text-ink-2">
          <span className="rotulo me-3 text-ink-muted">Governs</span>
          <Foundations d={d} />
        </p>
        <p className="m-0 text-ink-2">
          Source: <code className="literal text-ink">{d.file}</code>.{' '}
          <a href={storyHref(DECISIONS_INDEX)} target="_top" className={link}>
            All decisions
          </a>
        </p>
      </div>
      <Markdown>{d.body}</Markdown>
    </>
  )
}

/**
 * Every decision, newest last, with its status and one line on what it
 * decided. A real table, so a screen reader can move down the Status column;
 * it scrolls inside its frame on a phone rather than pushing the page wide.
 */
export function DecisionIndex() {
  const cell = 'border-t border-keyline p-3 align-top text-start'
  return (
    <div className="sb-unstyled not-prose my-6 overflow-x-auto bg-cloth-pale font-ui text-sm text-ink shadow-cut">
      <table className="w-full min-w-[40rem] border-collapse">
        <caption className="sr-only">Architecture decisions, with status and what each decided</caption>
        <thead>
          <tr className="bg-cloth-shade">
            <th scope="col" className="rotulo p-3 text-start">Decision</th>
            <th scope="col" className="rotulo p-3 text-start">Status</th>
            <th scope="col" className="rotulo p-3 text-start">What it decided</th>
            <th scope="col" className="rotulo p-3 text-start">Governs</th>
          </tr>
        </thead>
        <tbody>
          {DECISIONS.map((d) => (
            <tr key={d.number}>
              <th scope="row" className={`${cell} w-1/4 font-normal`}>
                <DecisionLink d={d} />
              </th>
              <td className={`${cell} whitespace-nowrap`}>
                <DecisionStatusBadge status={d.status} />
              </td>
              <td className={`${cell} text-ink-2`}>{d.decided}</td>
              <td className={`${cell} text-ink-2`}>
                <Foundations d={d} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The note under a foundation page's heading: the decisions behind it, each
 * as one plain line and a link to the record. A foundation page says what the
 * system does; this is where a reader who asks "why" is sent.
 */
export function DecisionsBehind({ foundation }: { foundation: string }) {
  const behind = decisionsBehind(foundation)
  if (!behind.length) return null
  return (
    <div data-decisions className="sb-unstyled not-prose my-6 grid gap-2 bg-cloth-pale p-4 font-ui text-sm text-ink shadow-cut">
      <p className="m-0 rotulo text-ink-muted">Why it is this way</p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {behind.map(({ decision: d, why }) => (
          <li key={d.number} className="m-0 text-ink-2">
            {why}{' '}
            <a href={storyHref(d.page)} target="_top" className={link}>
              Decision {d.number}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
