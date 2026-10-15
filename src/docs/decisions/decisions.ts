/**
 * The architecture decision records in docs/adr/, as the docs site shows them.
 *
 * The Markdown files are the only copy. Each one is imported raw and rendered
 * on its own page, the way the Changelog page renders CHANGELOG.md, so an ADR
 * edited in the repository is the ADR the docs show. Title, date and status
 * are read from the file itself; nothing here restates them.
 *
 * What is written here is what an ADR file does not say about itself: the
 * name it goes by in the sidebar, one line on what it decided for the index,
 * and the foundation pages it governs, each with the "why" line that page
 * shows. decisions.test.ts fails if an ADR has no entry here or no page, and
 * if a foundation it governs does not link back.
 */

const SOURCES = import.meta.glob<string>('../../../docs/adr/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export type DecisionStatus = 'proposed' | 'accepted' | 'superseded'

export const STATUSES: readonly DecisionStatus[] = ['proposed', 'accepted', 'superseded']

interface Notes {
  /** The name in the sidebar, after the number. Short: the sidebar is narrow. */
  name: string
  /** What it decided, in one line, for the index. */
  decided: string
  /** Foundation page title → the one-line "why" that page shows for this decision. */
  governs: Record<string, string>
}

const NOTES: Record<string, Notes> = {
  '0001': {
    name: 'From editorial to product',
    decided:
      'Keep the identity whole (the cut, the band, zero radius) and re-argue the metrics for product software: type size, the primary action, a dark theme, density.',
    governs: {
      'Foundations/The cut': 'The cut, the band, relleno and diente were kept whole when the system moved into product software.',
      'Foundations/Typography': 'The 14px product base replaced the 17px editorial one, and the small end of the scale follows density.',
      'Foundations/Layers and elevation': 'The layers, the cut and the revealed band are the identity the system kept whole, so depth is cloth, not shadow.',
    },
  },
  '0002': {
    name: 'Primary is ink',
    decided: 'The primary action is an ink field. Rojo is kept for danger, so red appears only when something can be lost or has failed.',
    governs: {
      'Foundations/Color': 'Primary is ink, red means danger.',
    },
  },
  '0003': {
    name: 'Monospace for literals',
    decided: 'Martian Mono returns for machine literals only: ids, payloads, hashes, model names. Never a label, a heading or a number.',
    governs: {
      'Foundations/Typography': 'Martian Mono is for machine literals only, never a label, a heading or a table number.',
      'Foundations/Content and voice': 'Three voices with three jobs: the system, the reader and the machine, told apart by typeface.',
    },
  },
  '0004': {
    name: 'Themes with light-dark',
    decided: 'Every colour token is one light-dark() pair, so both themes are declared together and follow the OS with no script.',
    governs: {
      'Foundations/Color': 'Both themes are declared in one token, so a colour cannot exist in one and be forgotten in the other.',
      'Foundations/Accessibility': 'Both values of every colour sit side by side, so the contrast test resolves and checks both themes.',
      'Foundations/Tokens': 'Every colour is one light-dark() pair, which is why each row has a light and a dark value from one declaration.',
    },
  },
  '0005': {
    name: 'Density is a surface',
    decided: 'Density is a data-density attribute on any element, never a component prop. Every utility in the subtree re-scales.',
    governs: {
      'Foundations/Density': 'Density is a property of the surface, not a prop on each component.',
      'Foundations/Accessibility': 'Nothing drops below 11px text or a 24px target, even in compact.',
      'Foundations/Spacing': 'Density redefines the spacing unit on a surface, so every gap and padding in it re-scales with no component involved.',
    },
  },
  '0006': {
    name: 'One disclosure marker',
    decided: 'Every disclosure uses a plus that turns into a cross. A chevron always means navigation.',
    governs: {
      'Foundations/Iconography': 'One disclosure marker, a plus that turns into a cross. A chevron means you will go somewhere.',
      'Foundations/Motion': 'The disclosure marker turns at --motion-base, the same duration as the panel it opens.',
    },
  },
  '0007': {
    name: 'A closed bridge',
    decided:
      "Tailwind's default palette, radii, shadows, easings and other scales Mola replaces stop compiling. Every utility left has a Mola token behind it.",
    governs: {
      'Foundations/Tokens': "Tailwind's defaults are closed, so every utility you can write resolves to a token on this page.",
      'Foundations/Spacing': 'The page widths and the reading measure are Mola tokens, and the breakpoints are all in rem so they sort by width.',
      'Foundations/Motion': 'A bare transition runs on --motion-cut and the cut curve, not on Tailwind’s 150ms default.',
    },
  },
  '0008': {
    name: 'The rojo register',
    decided:
      'On a product screen rojo means danger and nothing else, used through the danger role. The editorial accent is gold or ink; rojo stays editorial in Prose.',
    governs: {
      'Foundations/Color': 'Rojo is danger on a product screen, through the danger role; the accent is gold, by name.',
      'Foundations/The cut': 'A red seam is band-danger: rojo is only ever danger on a product screen.',
    },
  },
  '0009': {
    name: 'Scroll-edge cue',
    decided: 'A region meant to scroll sideways draws a stitched ink edge on its trailing side while there is more past it, and nothing else may scroll sideways at 320px.',
    governs: {
      'Foundations/The cut': 'A stitched trailing edge (scroll-edge) marks a region that scrolls sideways; a solid keyline still means the panel ends.',
      'Foundations/Accessibility': 'Reflow is audited at 320px: only a region carrying the scroll-edge cue may scroll sideways.',
    },
  },
}

export interface Decision extends Notes {
  /** The four-digit number, from the file name. */
  number: string
  /** The file, relative to the repository root. */
  file: string
  /** The heading of the ADR, without its number. */
  title: string
  date: string
  status: DecisionStatus
  /** The record after its heading and its date line, as written. */
  body: string
  /** The Storybook title of its page. */
  page: string
}

const HEADING = /^#\s+(\d{4})\s+[—-]\s+(.+)$/m
const META = /^\*\*Date:\*\*\s*(\S+)\s*·\s*\*\*Status:\*\*\s*(\w+)\s*$/m

/**
 * Throws on a record that does not follow the template, rather than showing
 * a page with a blank status: the template is what makes the index possible.
 */
export function parseRecord(path: string, raw: string): Omit<Decision, keyof Notes | 'page'> {
  const file = `docs/adr/${path.split('/').at(-1)}`
  const number = file.match(/\/(\d{4})-/)?.[1]
  const heading = raw.match(HEADING)
  const meta = raw.match(META)
  if (!number || !heading || !meta) throw new Error(`${file} does not follow the ADR template (# NNNN — Title, then **Date:** · **Status:**)`)
  if (heading[1] !== number) throw new Error(`${file} is headed ${heading[1]}, but its file name says ${number}`)
  const status = meta[2]!.toLowerCase() as DecisionStatus
  if (!STATUSES.includes(status)) throw new Error(`${file} has status "${meta[2]}"; expected one of ${STATUSES.join(', ')}`)
  const body = raw.replace(HEADING, '').replace(META, '').trim()
  return { number, file, title: heading[2]!.trim(), date: meta[1]!, status, body }
}

/** Records with no notes are left out here; decisions.test.ts names them. */
export const DECISIONS: Decision[] = Object.entries(SOURCES)
  .map(([path, raw]) => parseRecord(path, raw))
  .flatMap((record) => {
    const notes = NOTES[record.number]
    return notes ? [{ ...record, ...notes, page: `Decisions/${record.number} ${notes.name}` }] : []
  })
  .sort((a, b) => a.number.localeCompare(b.number))

export const ADR_FILES = Object.keys(SOURCES).map((path) => `docs/adr/${path.split('/').at(-1)}`)

export function decision(number: string): Decision {
  const found = DECISIONS.find((d) => d.number === number)
  if (!found) throw new Error(`No decision ${number}`)
  return found
}

/** The decisions a foundation page links to, in number order, with that page's "why" line. */
export function decisionsBehind(foundation: string) {
  return DECISIONS.flatMap((d) => (d.governs[foundation] ? [{ decision: d, why: d.governs[foundation] }] : []))
}

export const DECISIONS_INDEX = 'Decisions/All decisions'
