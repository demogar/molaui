import { minorOf, WHATS_NEW } from './changes'

// The list itself is in changes.ts, with why it lives there.
export { WHATS_NEW }

/** The stories title of a What's new page. MDX needs it as a literal, so the test compares the two. */
export const whatsNewTitle = (version: string) => `Mola UI/What's new/${minorOf(version)}`

/** The What's new page for a version's minor line, if one was written. */
export function whatsNewFor(version: string) {
  const v = WHATS_NEW.find((w) => minorOf(w) === minorOf(version))
  return v ? whatsNewTitle(v) : undefined
}
