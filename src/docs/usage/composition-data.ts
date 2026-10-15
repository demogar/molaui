import compositionFile from '../../../docs/ai/composition.json'
import type { Composition } from './composition'

/**
 * The generated composition (docs/ai/composition.json, written by
 * scripts/export-manifest.ts from the imports), read both ways: what a
 * pattern is built from, and which patterns a component is
 * used in. Small on purpose, so the docs pages can import it without pulling
 * in the whole component manifest.
 */
export const COMPOSITIONS: Record<string, Composition> = compositionFile.compositions as Record<string, Composition>

export function builtFromOf(title: string): string[] {
  return COMPOSITIONS[title]?.builtFrom ?? []
}

/** The patterns a component is used in, alphabetical. */
export function usedIn(title: string): string[] {
  return Object.entries(COMPOSITIONS)
    .filter(([, composition]) => composition.builtFrom.includes(title))
    .map(([from]) => from)
    .sort((a, b) => a.localeCompare(b))
}
