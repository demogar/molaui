import type { ThemeName } from './resolve'

/**
 * Every foreground/ground pairing the system promises, with the contrast it
 * owes. 4.5 is text (WCAG 1.4.3). 3 is a UI boundary or graphic mark (1.4.11).
 *
 * This list lived inside src/tokens/contract.test.ts, where it was the only
 * place the knowledge existed, so an agent reading the published docs could
 * not tell `--ink-muted` on `--anil-soft` (measured, promised) from
 * `--ink-muted` on `--cloth-deep` (never measured). It is a module now so the
 * contract test, the agent docs (scripts/export-manifest.ts) and the scope
 * test (scopes.test.ts) read one list: a pairing can only be published if the
 * test is measuring it, and it can only be measured between tokens whose
 * scopes say they can meet that way.
 *
 * A pairing with `themes` holds only in those themes. A minimum under 3 is a
 * measurement the contract records, not a promise, and is never published.
 */
export type Pair = [fg: string, bg: string, min: number, themes?: ThemeName[]]

const grounds = ['--cloth', '--cloth-pale', '--cloth-shade']
const inks = ['--ink', '--ink-2', '--ink-muted']
// The role washes are aliases of layer washes, measured under their own
// names so a re-accented or re-dyed role is measured too.
const washes = ['--rojo-soft', '--anil-soft', '--verde-soft', '--oro-soft', '--ink-soft', '--danger-soft', '--accent-soft', '--selected']

export const PAIRS: Pair[] = [
  // The ink ramp on every cloth ground.
  ...grounds.flatMap((g) => inks.map((i): Pair => [i, g, 4.5])),
  // The ink ramp on every wash.
  ...washes.flatMap((w) => inks.map((i): Pair => [i, w, 4.5])),
  // Layer and status colours as text on the page and on raised cloth.
  ...['--cloth', '--cloth-pale'].flatMap((g) =>
    ['--rojo', '--rojo-deep', '--anil', '--verde', '--warn', '--danger', '--success', '--info', '--ink-danger'].map(
      (c): Pair => [c, g, 4.5],
    ),
  ),
  // Gold carries text only in the dark theme; on light cloth it is a field.
  ['--oro', '--cloth', 4.5, ['dark']],
  ['--oro', '--cloth', 1, ['light']],
  // Ink on filled layers.
  ['--on-layer', '--rojo', 4.5],
  ['--on-layer', '--rojo-deep', 4.5],
  ['--on-layer', '--anil', 4.5],
  ['--on-layer', '--verde', 4.5],
  ['--on-oro', '--oro', 4.5],
  ['--on-accent', '--accent', 4.5],
  // A filled danger region: the danger button, a solid badge, a highlighted
  // destructive menu item, a failure count. And pressed.
  ['--on-layer', '--danger', 4.5],
  ['--on-layer', '--danger-strong', 4.5],
  // The inverse panel.
  ['--on-ink', '--ink', 4.5],
  ['--on-ink-muted', '--ink', 4.5],
  ['--oro', '--ink', 4.5, ['light']],
  ['--on-ink-accent', '--ink', 4.5],
  // The disabled ground: muted ink is the disabled label, and the keyline
  // stays, because a disabled control is stated, not faded.
  ...inks.map((i): Pair => [i, '--disabled', 4.5]),
  ['--ink', '--disabled', 3],
  // A tinted label.
  ['--rojo-on-shade', '--cloth-shade', 4.5],
  // The deepest cloth carries text too: a hovered tab, a disabled checked box.
  // It was never measured until scopes.test.ts read it off the components.
  // --ink-muted is NOT promised here: 4.29 in light, so anything disabled on
  // --cloth-deep steps up to --ink-2.
  ['--ink', '--cloth-deep', 4.5],
  ['--ink-2', '--cloth-deep', 4.5],
  // A layer's own colour as text on its wash: the soft Badge. The 3:1 swatch
  // pairings below are the weaker promise for the same two tokens.
  ['--anil', '--anil-soft', 4.5],
  ['--verde', '--verde-soft', 4.5],
  ['--rojo-deep', '--rojo-soft', 4.5],
  // Danger's words on its own wash: a failed tool call, an error callout.
  ['--ink-danger', '--danger-soft', 4.5],
  // Status ink on the neutral wash: a pressed feedback button in Message.
  // --ink-warn is not promised here (4.24 in light) and nothing uses it.
  ['--ink-success', '--ink-soft', 4.5],
  ['--ink-danger', '--ink-soft', 4.5],
  // Swatch keys are graphics (3:1) on every ground, and a flat callout's
  // swatch sits on its own tone's wash. --oro is absent on purpose: the
  // accent swatch carries an ink keyline because gold on light cloth fails.
  ...grounds.flatMap((g) =>
    ['--ink-muted', '--anil', '--verde', '--warn', '--rojo'].map((c): Pair => [c, g, 3]),
  ),
  ['--ink-muted', '--ink-soft', 3],
  ['--anil', '--anil-soft', 3],
  ['--verde', '--verde-soft', 3],
  ['--warn', '--oro-soft', 3],
  ['--rojo', '--rojo-soft', 3],
  // The danger bar on the danger wash (bar-start-danger on bg-danger-soft).
  ['--danger', '--danger-soft', 3],
  // The keyline bounds every control: a UI boundary owes 3:1.
  ...grounds.map((g): Pair => ['--ink', g, 3]),
]

/**
 * Text over a translucent overlay, which has no colour of its own until it is
 * composited onto whatever is beneath it. The scrim exists for a photograph
 * or a video frame, the one ground the system cannot know, so it is measured
 * at the bounds of what can be beneath: pure white and pure black (`white`,
 * `black`), and every cloth in both themes (`--cloth-pale` in light is the
 * lightest cloth, `--cloth-shade` in dark the darkest). The overlay is
 * composited onto each with `over()`, then the foreground, translucent or
 * not, onto that, as the browser paints them. A pairing in PAIRS cannot say
 * this, because its ground is one token.
 */
export interface Overlaid {
  fg: string
  overlay: string
  under: string[]
  min: number
}

const anything = ['white', 'black', '--cloth', '--cloth-pale', '--cloth-shade', '--cloth-deep']

export const OVERLAID: Overlaid[] = [
  { fg: '--on-scrim', overlay: '--scrim', under: anything, min: 4.5 },
  { fg: '--on-scrim-muted', overlay: '--scrim', under: anything, min: 4.5 },
]

/** A pairing as an agent reads it from one side: the other token, the ratio, and the themes it holds in. */
export interface Pairing {
  token: string
  min: number
  themes?: ThemeName[]
}

/**
 * The pairings that are promises: a minimum of 3 or more, and where the same
 * two tokens are promised at 4.5 and at 3 in the same themes, only the
 * stronger, since it implies the other. This is what the agent docs publish.
 */
export function promisedPairs(): Pair[] {
  const out: Pair[] = []
  for (const pair of PAIRS) {
    const [fg, bg, min, themes] = pair
    if (min < 3) continue
    const same = out.find(([f, b, , t]) => f === fg && b === bg && String(t) === String(themes))
    if (same) same[2] = Math.max(same[2], min)
    else out.push([fg, bg, min, ...(themes ? [themes] : [])] as Pair)
  }
  return out
}

/**
 * The published pairings of one token, from each side: `on` is the grounds it
 * reads on as a foreground, `under` is the foregrounds it carries as a ground.
 */
export function pairingsOf(name: string): { on: Pairing[]; under: Pairing[] } {
  const promised = promisedPairs()
  const side = (mine: 0 | 1): Pairing[] =>
    promised
      .filter((pair) => pair[mine] === name)
      .map(([fg, bg, min, themes]) => ({ token: mine === 0 ? bg : fg, min, ...(themes ? { themes } : {}) }))
  return {
    on: [...side(0), ...OVERLAID.filter((o) => o.fg === name).map((o) => ({ token: o.overlay, min: o.min }))],
    under: [...side(1), ...OVERLAID.filter((o) => o.overlay === name).map((o) => ({ token: o.fg, min: o.min }))],
  }
}
