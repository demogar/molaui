/**
 * Lifecycle phases: how far a component's API can be trusted, in one word.
 *
 * The phase lives in one place, the Storybook `tags` of each stories meta
 * (`tags: ['stable']`), and everything else reads it from there: the badge on
 * the docs page, the sidebar's tag filter, the agent manifest and the test
 * that every component page has exactly one. Tags were chosen over a field in
 * guidance.ts because Storybook already indexes them: the sidebar can filter
 * by phase with no addon, and a reader browsing `Experimental` sees only
 * experimental components. A field in guidance.ts would have been invisible
 * to the sidebar.
 *
 * What each phase promises is defined in prose on the Versioning page
 * (src/docs/versioning.mdx); `promise` here is the one-line form of it that
 * the badge and the manifest repeat.
 */
export type Phase = 'experimental' | 'stable' | 'deprecated'

export const PHASES: Record<Phase, { label: string; promise: string }> = {
  experimental: {
    label: 'Experimental',
    promise: 'Its API may change in a minor release, without a deprecation first.',
  },
  stable: {
    label: 'Stable',
    promise: 'Semantic versioning applies: nothing breaks without a deprecation first.',
  },
  deprecated: {
    label: 'Deprecated',
    promise: 'It still works and warns in development. It will be removed; move to its replacement.',
  },
}

const NAMES = Object.keys(PHASES) as Phase[]

/** The phase tags on a stories meta. A component page must have exactly one. */
export function phasesIn(tags: readonly string[] | undefined): Phase[] {
  return (tags ?? []).filter((tag): tag is Phase => (NAMES as string[]).includes(tag))
}

/** The one phase of a component page, or undefined when it has none (a showcase or a pattern) or more than one. */
export function phaseOf(tags: readonly string[] | undefined): Phase | undefined {
  const found = phasesIn(tags)
  return found.length === 1 ? found[0] : undefined
}
