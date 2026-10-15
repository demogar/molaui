import { Ban, Check, FlaskConical } from 'lucide-react'
import type * as React from 'react'

import pkg from '../../../package.json'
import { Badge, type BadgeTone } from '../../components/badge'
import { Code } from '../../components/code'
import { KbdChord } from '../../components/typography'
import type { PageData, RelatedLink } from '../usage/contract'
import { type Phase, PHASES } from '../usage/lifecycle'
import { storyHref } from '../usage/links'
import { titleName } from './usage'

/**
 * The sections of a component's docs page that are not Usage: the summary and
 * lifecycle badge, the Examples heading, Accessibility and Related. The order
 * they appear in is not decided here but in SECTIONS (src/docs/usage/contract.ts).
 *
 * Every block carries `sb-unstyled`, because Storybook's docs styles are
 * unlayered and would beat every Tailwind utility on these elements.
 */

const PHASE_LOOK: Record<Phase, { tone: BadgeTone; Glyph: typeof Check }> = {
  stable: { tone: 'success', Glyph: Check },
  experimental: { tone: 'warn', Glyph: FlaskConical },
  deprecated: { tone: 'danger', Glyph: Ban },
}

function Link({ link }: { link: RelatedLink }) {
  return (
    <a href={storyHref(link.title)} target="_top" className="font-semibold text-ink underline underline-offset-2">
      {link.label ?? titleName(link.title)}
    </a>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="m-0 text-xl font-bold text-ink">{children}</h2>
}

/**
 * The phase as a badge: glyph, word and tone, never the tone alone, the same
 * rule the components follow. The promise is spelled out next to it, because
 * "Stable" means nothing until the reader knows what it guarantees.
 */
export function PhaseBadge({ phase }: { phase: Phase }) {
  const { tone, Glyph } = PHASE_LOOK[phase]
  return (
    <Badge tone={tone} variant="soft" data-phase={phase}>
      <Glyph aria-hidden className="size-3.5" strokeWidth={2.5} />
      {PHASES[phase].label}
    </Badge>
  )
}

export function SummaryStatus({ page }: { page: PageData }) {
  const phase = page.phases[0]
  if (!page.usage || !phase) return null
  return (
    <section data-summary className="sb-unstyled not-prose my-6 grid gap-3 font-ui text-sm text-ink">
      <p className="m-0 font-text text-lg leading-snug text-ink">{page.usage.summary}</p>
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-2">
        <span className="rotulo text-ink-muted">Status</span>
        <PhaseBadge phase={phase} />
        <span>
          {PHASES[phase].promise}{' '}
          <a href="?path=/docs/mola-ui-versioning--overview" target="_top" className="text-ink underline underline-offset-2">
            What the phases mean
          </a>
          .
        </span>
      </p>
      {page.usage.replacedBy ? (
        <p className="m-0 text-ink-2">
          Use <Link link={{ title: page.usage.replacedBy }} /> instead.
        </p>
      ) : null}
    </section>
  )
}

export function ExamplesHeading() {
  return (
    <div className="sb-unstyled not-prose mt-10 mb-2 font-ui">
      <SectionHeading>Examples</SectionHeading>
    </div>
  )
}

/** The heading Storybook's Stories block takes, one level under Examples. */
export function EveryExampleHeading() {
  return <h3 className="sb-unstyled m-0 mt-8 mb-4 font-ui rotulo text-ink-muted">Every example</h3>
}

const cell = 'border-b border-keyline px-3 py-2 align-top text-start'

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {keys.map((chord, i) => (
        <span key={chord} className="inline-flex items-center gap-1.5">
          {i > 0 ? <span className="text-ink-muted">or</span> : null}
          <KbdChord keys={chord.split('+')} />
        </span>
      ))}
    </span>
  )
}

/**
 * The accessibility data names props and elements in backticks, as the
 * manifest's Markdown does; on the page they become the system's own inline
 * Code, so `aria-label` is set as the literal it is.
 */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <Code key={i}>{part}</Code> : part))}
    </>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
      {items.map((line) => (
        <li key={line}>
          <Inline text={line} />
        </li>
      ))}
    </ul>
  )
}

/** One row of the evidence table: what is checked, and the answer for this component. */
function EvidenceRow({ check, children }: { check: string; children: React.ReactNode }) {
  return (
    <tr>
      <th scope="row" className={`${cell} w-2/5 font-semibold text-ink`}>
        {check}
      </th>
      <td className={`${cell} text-ink-2`}>{children}</td>
    </tr>
  )
}

const file = (path: string) => path.split('/').at(-1)

/**
 * Keyboard, the split of responsibilities, and the testing status.
 *
 * The testing status is generated (scripts/export-evidence.ts), and its rows
 * say what is checked on every pull request rather than what passed once,
 * because the gates are required: a story that fails axe cannot merge. The
 * screen-reader row says plainly that nobody has tested by hand yet. A table
 * that reads "Pass" everywhere would be the one claim on the page nobody
 * could check.
 */
export function AccessibilitySection({ page }: { page: PageData }) {
  const a11y = page.accessibility
  const evidence = page.evidence
  if (!a11y || !evidence) return null
  const interactive = Boolean(a11y.keyboard?.length)
  return (
    <section data-a11y className="sb-unstyled not-prose my-10 grid gap-6 font-ui text-sm text-ink">
      <SectionHeading>Accessibility</SectionHeading>
      {a11y.keyboard?.length ? (
        <div className="grid gap-2">
          <h3 className="m-0 rotulo text-ink-muted">Keyboard</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${cell} w-2/5 rotulo text-ink-muted`}>
                  Key
                </th>
                <th scope="col" className={`${cell} rotulo text-ink-muted`}>
                  What happens
                </th>
              </tr>
            </thead>
            <tbody>
              {a11y.keyboard.map((row, i) => (
                <tr key={`${i}-${row.keys.join()}`}>
                  <td className={cell}>
                    <Keys keys={row.keys} />
                  </td>
                  <td className={`${cell} text-ink-2`}>
                    <Inline text={row.action} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="m-0 text-ink-2">Nothing in it takes focus, so there is no keyboard table.</p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="m-0 rotulo text-ink-muted">Mola handles</h3>
          <List items={a11y.handles} />
        </div>
        <div className="grid content-start gap-2">
          <h3 className="m-0 rotulo text-ink-muted">You handle</h3>
          <List items={a11y.you} />
        </div>
      </div>
      <div className="grid gap-2">
        <h3 className="m-0 rotulo text-ink-muted">Testing status, version {pkg.version}</h3>
        <table className="w-full border-collapse">
          <tbody>
            <EvidenceRow check="Automated, jsdom">
              Each of its {evidence.stories} {evidence.stories === 1 ? 'story is' : 'stories is'} rendered and checked
              with axe on every pull request. Contrast is left to the browser, because jsdom does not paint.
            </EvidenceRow>
            <EvidenceRow check="Automated, browser">
              On every pull request, every story is checked in Chromium with axe, colour contrast included, in the
              light and the dark theme, and for horizontal overflow at 390px wide.
            </EvidenceRow>
            <EvidenceRow check="Keyboard in unit tests">
              {evidence.keyboardInUnitTests
                ? `Yes: ${evidence.unitTests.map(file).join(', ')} ${evidence.unitTests.length === 1 ? 'presses' : 'press'} every key in the table above, and ${evidence.unitTests.length === 1 ? 'runs' : 'run'} on every pull request.`
                : interactive
                  ? `Not yet: ${evidence.unitTests.map(file).join(', ') || 'its unit tests'} ${evidence.unitTests.length === 1 ? 'does' : 'do'} not press ${evidence.keysUntested.join(', ')}. The keys above come from the source and the Base UI primitive it wraps.`
                  : 'Not applicable: nothing in it takes focus.'}
            </EvidenceRow>
            <EvidenceRow check="Screen readers">
              <strong className="font-semibold text-ink">Not yet tested by hand.</strong> No one has run this component
              with VoiceOver, NVDA or JAWS and written down the result.
            </EvidenceRow>
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * Related: where to go instead, who sends readers here, and where the
 * component is used. "Used in" is read from the patterns' and showcases'
 * imports (docs/ai/composition.json), so it lists only screens that really
 * import the component, and gains a screen the day one starts to.
 */
export function RelatedSection({ page }: { page: PageData }) {
  if (!page.alternatives.length && !page.pointingHere.length && !page.usedIn.length) return null
  return (
    <section data-related className="sb-unstyled not-prose my-10 grid gap-4 font-ui text-sm text-ink">
      <SectionHeading>Related</SectionHeading>
      <div className="grid gap-6 md:grid-cols-2">
        {page.alternatives.length ? (
          <div className="grid content-start gap-2">
            <h3 className="m-0 rotulo text-ink-muted">Use instead, when it fits better</h3>
            <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
              {page.alternatives.map((link) => (
                <li key={link.title}>
                  <Link link={link} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {page.pointingHere.length ? (
          <div className="grid content-start gap-2">
            <h3 className="m-0 rotulo text-ink-muted">Pages that send readers here</h3>
            <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
              {page.pointingHere.map((link) => (
                <li key={link.title}>
                  <Link link={link} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {page.usedIn.length ? (
          <div data-used-in className="grid content-start gap-2">
            <h3 className="m-0 rotulo text-ink-muted">Used in</h3>
            <ul className="m-0 grid list-disc gap-1.5 ps-5 text-ink-2">
              {page.usedIn.map((link) => (
                <li key={link.title}>
                  <Link link={link} />
                  <span className="text-ink-muted"> · {link.title.startsWith('Patterns/') ? 'pattern' : 'showcase'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
