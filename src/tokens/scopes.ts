/**
 * What each colour token may be used FOR.
 *
 * theme.css bridges every colour token to Tailwind's colour namespace, and
 * Tailwind then generates every colour utility for every one of them:
 * `text-cloth-pale`, `bg-on-ink-muted` and `border-scrim` all compile. The
 * agent docs used to publish exactly that, `bg-X / text-X` for every token,
 * which told a model that raised cloth is a text colour. The palette's own
 * rules say otherwise — colour owns regions, the keyline is decorative, gold
 * is never text on light cloth — but those rules lived in comments.
 *
 * So each token is scoped here to the jobs it does, from a closed set of five
 * that follows the system's real roles rather than CSS properties:
 *
 *   surface  a ground that carries content: the cloth, the washes, a filled
 *            layer panel, the inverse ink panel. Paired as the BACKGROUND of a
 *            promised contrast.
 *   text     the colour of words and of the icons that inherit it. Paired as
 *            the FOREGROUND, at 4.5.
 *   edge     a line: a keyline, a divider, an underline, a current-item bar,
 *            the revealed band of a cut. Mola draws most of these with
 *            box-shadow, which is why Figma gets stroke AND effect colour.
 *   mark     a small filled graphic that is not a region: a status dot, a
 *            swatch key, a switch thumb, a divider drawn as a 1px box. Owes 3:1
 *            where it means something.
 *   overlay  a translucent fill over content the system cannot know: the
 *            scrim on a photograph, the backdrop behind a modal. Never a
 *            ground for a measured pairing, because what shows through is
 *            unknown.
 *
 * `status-fill` was considered and folded into `mark`: every status fill in
 * the components is a dot or a swatch, never a region (a status REGION uses a
 * wash, which is a surface). Separate `rule` and `edge` scopes were tried and
 * merged for the same reason: they differ in CSS property, not in meaning.
 *
 * The approach (scope each token family to the properties it is valid on, and
 * give every semantic token its code syntax) follows Jason Arnold, "Creating
 * design systems in Figma for AI".
 *
 * scopes.test.ts fails if a colour token has no entry, an entry names a token
 * that does not exist, a promised pairing in ./pairings.ts meets a token
 * outside its scope, or a component uses a colour utility its token is not
 * scoped for.
 */

export type Scope = 'surface' | 'text' | 'edge' | 'mark' | 'overlay'

export interface ScopeInfo {
  /** One line for the docs and the agent manifest. */
  meaning: string
  /**
   * The Tailwind colour-utility prefixes this scope allows. The first ones are
   * what the docs publish; the rest are also accepted by the component check
   * (a `placeholder:` colour is text, an `outline-` colour is an edge).
   */
  tailwind: string[]
  /** Published, the prefixes listed per token in the manifest. */
  publish: string[]
  /** Figma's VariableScope names, for tokens/mola.tokens.json. */
  figma: string[]
}

export const SCOPES: Record<Scope, ScopeInfo> = {
  surface: {
    meaning: 'A ground that carries content: a page, a panel, a card, a wash, a filled layer.',
    tailwind: ['bg'],
    publish: ['bg'],
    figma: ['FRAME_FILL', 'SHAPE_FILL'],
  },
  text: {
    meaning: 'The colour of words, and of icons that inherit `currentColor`.',
    tailwind: ['text', 'placeholder', 'caret'],
    publish: ['text'],
    figma: ['TEXT_FILL'],
  },
  edge: {
    meaning: 'A line: a keyline, a divider, an underline, a current-item bar, the revealed band of a cut. Mola draws most edges with `box-shadow`.',
    tailwind: ['border', 'border-x', 'border-y', 'border-t', 'border-b', 'border-s', 'border-e', 'border-l', 'border-r', 'divide', 'outline', 'ring', 'decoration', 'stroke'],
    publish: ['border', 'decoration'],
    figma: ['STROKE_COLOR', 'EFFECT_COLOR'],
  },
  mark: {
    meaning: 'A small filled graphic that is not a region: a status dot, a swatch key, a switch thumb, a rule drawn as a 1px box.',
    tailwind: ['bg', 'fill', 'stroke'],
    publish: ['bg', 'fill'],
    figma: ['SHAPE_FILL'],
  },
  overlay: {
    meaning: 'A translucent fill over content the system cannot know: a scrim over an image, the backdrop behind a modal.',
    tailwind: ['bg'],
    publish: ['bg'],
    figma: ['FRAME_FILL', 'SHAPE_FILL'],
  },
}

/**
 * Every Tailwind prefix that takes a colour, whether or not a scope allows it.
 * The component check recognises a utility by these, so a colour utility with
 * a prefix no scope allows (`shadow-ink`, `from-oro`) is reported rather than
 * silently skipped.
 */
export const COLOR_PREFIXES = [
  ...new Set([
    ...Object.values(SCOPES).flatMap((s) => s.tailwind),
    'ring-offset',
    'inset-ring',
    'shadow',
    'inset-shadow',
    'drop-shadow',
    'text-shadow',
    'accent',
    'from',
    'via',
    'to',
  ]),
]

interface Entry {
  scopes: Scope[]
  /** Only where the scope is wider than the token's section of tokens.css suggests. */
  why?: string
}

/** Every colour token in tokens.css: everything theme.css bridges to `--color-*`, and `--band`. */
export const COLOR_SCOPES: Record<string, Entry> = {
  // ── cloth
  '--cloth': { scopes: ['surface'] },
  '--cloth-pale': { scopes: ['surface'] },
  '--cloth-shade': { scopes: ['surface'] },
  '--cloth-deep': { scopes: ['surface'] },

  // ── ink
  '--ink': {
    scopes: ['text', 'edge', 'surface', 'mark'],
    why: 'The top layer is body ink, every interactive keyline, the inverse panel that carries --on-ink, and the today dot and switch thumb.',
  },
  '--ink-2': { scopes: ['text'] },
  '--ink-muted': {
    scopes: ['text', 'mark', 'edge'],
    why: 'The floor of the text ramp, and the neutral swatch key and disabled thumb, promised at 3:1 as a graphic.',
  },

  // ── keylines
  '--keyline': {
    scopes: ['edge', 'mark'],
    why: 'Decorative dividers. A divider drawn as a 1px box (Divider, menu and toolbar separators, <hr>) is a background in CSS and a rule in meaning.',
  },
  '--keyline-soft': { scopes: ['edge'] },

  // ── the four layers
  '--rojo': {
    scopes: ['surface', 'text', 'mark', 'edge'],
    why: 'A layer fills a panel (carrying --on-layer), reads as text on cloth, keys a swatch and is a cut band.',
  },
  '--rojo-deep': { scopes: ['surface', 'text'], why: 'The pressed danger button carries --on-layer; links in prose read at 4.5.' },
  '--anil': { scopes: ['surface', 'text', 'mark', 'edge'], why: 'As --rojo.' },
  '--verde': { scopes: ['surface', 'text', 'mark', 'edge'], why: 'As --rojo.' },
  '--oro': {
    scopes: ['surface', 'mark', 'edge'],
    why: 'Gold is a field and a mark, never text: it fails on light cloth. It reads only on the light ink panel and on dark cloth, so it is not text-scoped.',
  },
  '--on-layer': {
    scopes: ['text', 'mark'],
    why: 'Ink on a filled layer, and the thumb of a checked switch on verde.',
  },
  '--on-oro': { scopes: ['text'] },

  // ── status
  '--danger': {
    scopes: ['mark', 'edge'],
    why: 'The status tone, for a dot, a swatch key, a bar or a ring. Words in a status take --ink-danger, which on-layer collapses on a filled panel where no status hue survives; the contract measures the tone on cloth at 4.5 because --ink-danger resolves to it.',
  },
  '--success': { scopes: ['mark', 'edge'], why: 'As --danger: words take --ink-success.' },
  '--warn': { scopes: ['mark', 'edge'], why: 'As --danger: words take --ink-warn.' },
  '--info': { scopes: ['mark', 'edge'], why: 'As --danger: words take --ink-info.' },
  '--ink-danger': { scopes: ['text'] },
  '--ink-success': { scopes: ['text'] },
  '--ink-warn': { scopes: ['text'] },
  '--ink-info': { scopes: ['text'] },

  // ── washes
  '--rojo-soft': { scopes: ['surface'] },
  '--anil-soft': { scopes: ['surface'] },
  '--verde-soft': { scopes: ['surface'] },
  '--oro-soft': { scopes: ['surface'] },
  '--ink-soft': { scopes: ['surface'] },
  '--ink-on-tint': { scopes: ['text'] },
  '--rojo-on-shade': { scopes: ['text'] },
  '--rojo-rule': { scopes: ['edge'] },

  // ── on an ink panel
  '--on-ink': {
    scopes: ['text', 'mark'],
    why: 'Words on the ink panel, and the today dot on an ink range endpoint.',
  },
  '--on-ink-muted': { scopes: ['text'] },
  '--on-ink-accent': { scopes: ['text'] },
  '--keyline-on-ink': { scopes: ['edge'] },

  // ── over arbitrary pixels
  '--scrim': { scopes: ['overlay'] },
  '--on-scrim': { scopes: ['text'] },
  '--on-scrim-muted': { scopes: ['text'] },
  '--backdrop': { scopes: ['overlay'] },

  // ── the cut
  '--band': {
    scopes: ['edge', 'mark'],
    why: 'The revealed colour of a cut, set per element with band-*: the middle ring of cut-band, and the fill of relleno.',
  },
}

/** The Tailwind utilities a token is published with: one per published prefix of each of its scopes. */
export function utilitiesOf(name: string, bridged: boolean): string[] {
  const entry = COLOR_SCOPES[name]
  if (!entry || !bridged) return []
  const prefixes = [...new Set(entry.scopes.flatMap((s) => SCOPES[s].publish))]
  return prefixes.map((p) => `${p}-${name.slice(2)}`)
}

/** Whether `prefix-<token>` is inside the token's scopes. */
export function allows(name: string, prefix: string): boolean {
  return (COLOR_SCOPES[name]?.scopes ?? []).some((s) => SCOPES[s].tailwind.includes(prefix))
}

/** The Figma VariableScope names a token is imported with. */
export function figmaScopesOf(name: string): string[] {
  return [...new Set((COLOR_SCOPES[name]?.scopes ?? []).flatMap((s) => SCOPES[s].figma))]
}
