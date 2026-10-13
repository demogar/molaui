import compositionFile from '../../../docs/ai/composition.json'
import type { Composition } from './composition'

/**
 * The generated composition (docs/ai/composition.json, written by
 * scripts/export-manifest.ts from the imports), read both ways: what a
 * pattern is built from, and which patterns and showcases a component is
 * used in. Small on purpose, so the docs pages can import it without pulling
 * in the whole component manifest.
 */
export const COMPOSITIONS: Record<string, Composition> = compositionFile.compositions as Record<string, Composition>

export function builtFromOf(title: string): string[] {
  return COMPOSITIONS[title]?.builtFrom ?? []
}

/** Patterns first, then showcases, each alphabetical: a pattern is the closer match to a reader's own screen. */
export function usedIn(title: string): string[] {
  return Object.entries(COMPOSITIONS)
    .filter(([, composition]) => composition.builtFrom.includes(title))
    .sort(([a, x], [b, y]) => Number(x.kind !== 'pattern') - Number(y.kind !== 'pattern') || a.localeCompare(b))
    .map(([from]) => from)
}
