/**
 * The docs table of contents (Storybook's TableOfContents, built on tocbot).
 *
 * tocbot links each entry to its heading's id and does nothing else: an entry
 * for a heading with no id gets `href="#"`, and Storybook's click handler
 * drops it, so the click did nothing at all. Storybook ids only the headings
 * it renders itself (MDX headings and story titles). Every heading a custom
 * block wrote (Usage, Examples, Accessibility, a pattern's Built from and
 * States) had none, and those were most of the entries on every component and
 * pattern page.
 *
 * The section headings now carry ids written in their blocks, so a link to
 * `#accessibility` is stable. `withHeadingId` is the net under them: a heading
 * a block writes without an id (a foundations page's lists) is given one from
 * its text before tocbot reads it, and a repeated id is made unique, because
 * an entry whose id another heading also has scrolls to the first one. The
 * Changelog repeats "Features" and "Bug fixes" under every release.
 *
 * Rótulo headings are left out. A rótulo is a label over a list or a table
 * inside a section ("When to use", "Keyboard", "Every example"), and listed
 * they read as sections of their own, in capitals, between the real ones.
 * Nesting them under their section was the alternative; it doubled the
 * entries without adding a place worth jumping to, since each label sits a
 * line under the heading that is already listed.
 *
 * Headings inside a rendered example (`.sb-story`: an empty state's title, a
 * settings section in a pattern) belong to the example, not the page.
 */
export const TOC_IGNORE = '.rotulo, .sb-story h2, .sb-story h3'

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'section'
  )
}

/**
 * Called by tocbot for each heading, in document order, every time it builds
 * the contents. Idempotent: it reads the document rather than remembering
 * earlier calls, because tocbot rebuilds whenever the page re-renders.
 */
export function withHeadingId<T extends { id: string }>(entry: T, heading: HTMLElement): T {
  const doc = heading.ownerDocument
  const taken = (id: string) => {
    const first = doc.getElementById(id)
    return first !== null && first !== heading
  }
  if (!heading.id || taken(heading.id)) {
    const base = heading.id || slug(heading.textContent ?? '')
    let id = base
    for (let n = 2; taken(id); n++) id = `${base}-${n}`
    heading.id = id
  }
  return { ...entry, id: heading.id }
}
