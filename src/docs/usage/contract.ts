import evidenceFile from '../../../docs/accessibility/evidence.json'
import { type Anatomy, ANATOMY } from './anatomy'
import { ACCESSIBILITY, NON_INTERACTIVE } from './accessibility'
import type { Accessibility } from './accessibility-types'
import { USAGE, type Usage } from './guidance'
import { type Phase, phasesIn } from './lifecycle'

/**
 * The component page contract: every component page has the same sections in
 * the same order, so a reader always knows where to look.
 *
 *   1. Summary and status   what it is for, and its lifecycle phase
 *   2. Usage                when to use it, when not to, do and don't, content
 *   3. Anatomy (optional)   the live component with its parts pinned, and a
 *                           legend of what each part does and is made of
 *   4. Examples             the primary story, its controls, every story
 *   5. Accessibility        keyboard, what Mola handles, what you must do,
 *                           and the evidence behind it
 *   6. Related              the components this page sends readers to, and
 *                           the ones that send readers here
 *
 * Usage comes before the examples on purpose: "should I use this at all?" is
 * the first question, and a reader who scrolls past forty stories to find out
 * they wanted a different component has wasted the page.
 *
 * Anatomy sits between them: once a reader has decided to use the component,
 * the parts are the vocabulary the rest of the page is written in. Props,
 * stories and the accessibility notes say "the hint", "the seam", "the
 * status"; naming them once, on the real thing, before the examples, means
 * the reader meets each word with a picture. Before Usage it would be detail
 * for someone who may be on the wrong page.
 *
 * Anatomy is the one optional section: only components with real parts have
 * it (anatomy.ts says which and why). It renders nothing when a page has no
 * entry, and its check only holds an entry that exists to the contract.
 *
 * The docs page (.storybook/docs-page.tsx) renders SECTIONS in this order,
 * and usage.test.ts runs each section's `missing` against every component
 * page. A page that cannot fill a section fails the test; it never renders an
 * empty heading.
 */
export interface Evidence {
  stories: number
  unitTests: string[]
  keyboardInUnitTests: boolean
  screenReadersByHand: boolean
}

const EVIDENCE: Record<string, Evidence> = evidenceFile.components

export interface RelatedLink {
  title: string
  /** Shown instead of the title's last segment ("AlertDialog"). */
  label?: string
}

/** Everything a component page renders, gathered by its stories title. */
export interface PageData {
  title: string
  phases: Phase[]
  usage?: Usage
  accessibility?: Accessibility
  evidence?: Evidence
  /** The named parts, when the component has any worth a diagram. */
  anatomy?: Anatomy
  /** Components this page names as the better choice in "When not to". */
  alternatives: RelatedLink[]
  /** Components whose own "When not to" sends readers here. */
  pointingHere: RelatedLink[]
}

export function pageData(title: string, tags: readonly string[] | undefined): PageData {
  const usage = USAGE[title]
  const alternatives = dedupe(
    (usage?.avoid ?? []).flatMap((alt) => (alt.use && alt.use !== title ? [{ title: alt.use }] : [])),
  )
  const pointingHere = dedupe(
    Object.entries(USAGE).flatMap(([from, other]) =>
      from !== title && other.avoid.some((alt) => alt.use === title) ? [{ title: from }] : [],
    ),
  ).filter((link) => !alternatives.some((alt) => alt.title === link.title))
  return {
    title,
    phases: phasesIn(tags),
    usage,
    accessibility: ACCESSIBILITY[title],
    evidence: EVIDENCE[title],
    anatomy: ANATOMY[title],
    alternatives,
    pointingHere,
  }
}

function dedupe(links: RelatedLink[]) {
  return links.filter((link, i) => links.findIndex((other) => other.title === link.title) === i)
}

export type SectionId = 'summary' | 'usage' | 'anatomy' | 'examples' | 'accessibility' | 'related'

export interface Section {
  id: SectionId
  heading: string
  /** What this page lacks for the section to render, in words a failing test can print. Empty means complete. */
  missing: (page: PageData, knownTitles: ReadonlySet<string>) => string[]
}

export const SECTIONS: Section[] = [
  {
    id: 'summary',
    heading: 'Summary and status',
    missing: (page, known) => [
      ...(page.usage?.summary ? [] : ['a summary in guidance.ts']),
      ...(page.phases.length === 1 ? [] : [`exactly one lifecycle tag (has ${page.phases.length ? page.phases.join(', ') : 'none'})`]),
      ...(page.phases[0] === 'deprecated' && !page.usage?.replacedBy ? ['a replacedBy for a deprecated page'] : []),
      ...(page.phases[0] !== 'deprecated' && page.usage?.replacedBy ? ['no replacedBy unless deprecated'] : []),
      ...(page.usage?.replacedBy && !known.has(page.usage.replacedBy) ? [`a replacement that exists (${page.usage.replacedBy})`] : []),
    ],
  },
  {
    id: 'usage',
    heading: 'Usage',
    missing: (page) => [
      ...(page.usage?.use.length ? [] : ['at least one "When to use"']),
      ...(page.usage?.avoid.length ? [] : ['at least one "When not to"']),
    ],
  },
  {
    id: 'anatomy',
    heading: 'Anatomy',
    // Optional: no entry, no section. An entry must name parts, uniquely, in
    // kebab-case; anatomy.test.tsx checks them against the rendered story.
    missing: (page) => {
      const parts = page.anatomy?.parts.map((p) => p.part) ?? []
      if (!page.anatomy) return []
      return [
        ...(parts.length ? [] : ['at least one part']),
        ...parts.filter((p, i) => parts.indexOf(p) !== i).map((p) => `a part named once (${p})`),
        ...parts.filter((p) => !/^[a-z]+(-[a-z]+)*$/.test(p)).map((p) => `a kebab-case part name (${p})`),
      ]
    },
  },
  {
    id: 'examples',
    heading: 'Examples',
    missing: (page) => (page.evidence?.stories ? [] : ['at least one story, and an entry in docs/accessibility/evidence.json']),
  },
  {
    id: 'accessibility',
    heading: 'Accessibility',
    missing: (page) => {
      const a11y = page.accessibility
      if (!a11y) return ['an entry in accessibility.ts']
      const interactive = !NON_INTERACTIVE.has(page.title)
      return [
        ...(a11y.handles.length ? [] : ['at least one "Mola handles"']),
        ...(a11y.you.length ? [] : ['at least one "You handle"']),
        ...(interactive && !a11y.keyboard?.length ? ['a keyboard table (it is interactive)'] : []),
        ...(!interactive && a11y.keyboard ? ['no keyboard table (it is in NON_INTERACTIVE)'] : []),
        ...(!interactive && page.evidence?.keyboardInUnitTests
          ? ['to leave NON_INTERACTIVE: its unit tests press keys, so it has something to operate']
          : []),
        ...(page.evidence ? [] : ['an entry in docs/accessibility/evidence.json']),
      ]
    },
  },
  {
    id: 'related',
    heading: 'Related',
    missing: (page) => (page.alternatives.length + page.pointingHere.length ? [] : ['at least one related component']),
  },
]
