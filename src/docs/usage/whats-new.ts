import { minorOf } from './changes'

/**
 * The curated What's new pages, one per minor release, newest first. Each is
 * hand-written in src/docs/whats-new/ and gives the few changes that matter to
 * a reader; the full list stays on the Changelog page. A page can be written
 * before its release: it says "Unreleased" until package.json reaches its
 * version (see isReleased in changes.ts).
 *
 * changes.test.ts checks that every version here has a page with the matching
 * title, that the sidebar lists them in this order, and that every released
 * one is in CHANGELOG.md.
 */
export const WHATS_NEW = ['0.4.0', '0.3.0', '0.2.0'] as const

/** The stories title of a What's new page. MDX needs it as a literal, so the test compares the two. */
export const whatsNewTitle = (version: string) => `Mola UI/What's new/${minorOf(version)}`

/** The What's new page for a version's minor line, if one was written. */
export function whatsNewFor(version: string) {
  const v = WHATS_NEW.find((w) => minorOf(w) === minorOf(version))
  return v ? whatsNewTitle(v) : undefined
}
