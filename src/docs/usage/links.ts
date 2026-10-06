import { storyNameFromExport, toId } from 'storybook/internal/csf'

/**
 * Story and docs ids, computed with Storybook's own `toId`, so a link built
 * here is the id Storybook assigns. The docs pages, the agent manifest and the
 * link check (src/test/links.test.ts) all build links through these.
 */

/** The docs page of a stories title (`docs.defaultName` is "Overview"). */
export function docsId(title: string) {
  return toId(title, 'Overview')
}

/** A story, by its title and its export name. */
export function storyId(title: string, exportName: string) {
  return toId(title, storyNameFromExport(exportName))
}

/** A link that works from inside a docs page, where Storybook resolves `?path=` against the manager. */
export function storyHref(title: string) {
  return `?path=/docs/${docsId(title)}`
}
