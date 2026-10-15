import { contrast } from '../../tokens/color'
import { resolveColor, type ThemeName } from '../../tokens/resolve'

/**
 * The colours Foundations/Data visualisation offers a chart, in the order a
 * chart takes them.
 *
 * Each one is a graphic mark, so it owes 3:1 against every ground a chart
 * can sit on (WCAG 1.4.11). foundations.test.tsx checks that the contrast
 * contract already promises each of them at 3:1 on every ground in both
 * themes (src/tokens/pairings.ts), so the page cannot offer a series colour
 * nobody measures. It also keeps rojo and the danger role out: rojo means
 * something can be lost, or has failed (ADR 0008), and a chart line in it
 * reads as an alarm.
 *
 * Gold is not a series. On light cloth it measures 1.66:1, so it can only be
 * a mark with an ink keyline: the highlighted "now" point, as the sparkline
 * draws it.
 */
export const SERIES = [
  { token: '--ink', name: 'Ink', job: 'Every series, by default. Bars that carry their own labels need no colour to tell them apart.' },
  { token: '--ink-muted', name: 'Muted ink', job: 'The comparison: last week, the target, the baseline. Dashed.' },
  { token: '--anil', name: 'Añil', job: 'A second line, when two must be told apart at a glance. It also means information.' },
  { token: '--verde', name: 'Verde', job: 'A third line, labelled at its end. It also means success, so it suits a series of successes best.' },
  { token: '--warn', name: 'Warning gold', job: 'A fourth line, labelled at its end. It also means warning. Past four lines, use a table or small multiples.' },
] as const

/** The grounds a chart sits on: the page, a card, a well. */
export const CHART_GROUNDS = ['--cloth', '--cloth-pale', '--cloth-shade'] as const

/** The lowest ratio a series reaches against any chart ground, in one theme. */
export function worstOnGrounds(token: string, theme: ThemeName, decls: Map<string, string>) {
  const fg = resolveColor(decls.get(token)!, theme, decls)!
  return Math.min(...CHART_GROUNDS.map((g) => contrast(fg, resolveColor(decls.get(g)!, theme, decls)!)))
}
