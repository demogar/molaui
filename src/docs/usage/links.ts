/**
 * Storybook's id for a title, as its `sanitize()` computes it: lower case, runs
 * of anything but letters and digits collapsed to one hyphen, and the path
 * segments joined with a hyphen. Re-implemented rather than imported so the
 * manifest script can use it without loading Storybook; `links.test.ts` checks
 * every id it produces against the ids Storybook itself assigns.
 */
export function storyIdPrefix(title: string) {
  return title
    .toLowerCase()
    .replace(/[ ’'`~!@#$%^&*()+=[\]{};:"\\|,.<>/?]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The docs page of a stories title (`docs.defaultName` is "Overview"). */
export function docsId(title: string) {
  return `${storyIdPrefix(title)}--overview`
}

/** A link that works from inside a docs page, where Storybook resolves `?path=` against the manager. */
export function storyHref(title: string) {
  return `?path=/docs/${docsId(title)}`
}
