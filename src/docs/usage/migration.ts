import type { Release } from './changes'

/**
 * What the Migration page (src/docs/migration.mdx) owes CHANGELOG.md.
 *
 * Versioning promises that a breaking change ships with a migration note.
 * Until this page existed, the only note was the changelog line, which says
 * what changed and not what to do. So every release with a breaking entry
 * needs a section on the page, opened by `<ReleaseStatus version="x.y.z" />`,
 * and every breaking pull request in it must be linked from that section.
 *
 * Unlike What's new, the newest release is not exempt. A What's new page is
 * written after the release, for readers; a migration guide written after the
 * release is too late for whoever upgrades on the first day. release-please
 * writes the release into CHANGELOG.md on its release branch, so a breaking
 * release whose guide is missing turns its own release pull request red: add
 * the section in a pull request to main, and the release branch picks it up.
 */

export interface MissingMigration {
  version: string
  /** No section for the release at all. */
  section: boolean
  /** Breaking pull requests the section does not link. */
  prs: number[]
}

/** The text of the page between one `<ReleaseStatus version>` and the next. */
export function migrationSections(mdx: string): Map<string, string> {
  const out = new Map<string, string>()
  const marks = [...mdx.matchAll(/<ReleaseStatus version="([^"]+)"\s*\/>/g)]
  marks.forEach((m, i) => out.set(m[1]!, mdx.slice(m.index!, marks[i + 1]?.index ?? mdx.length)))
  return out
}

export function missingMigrations(releases: Release[], mdx: string): MissingMigration[] {
  const sections = migrationSections(mdx)
  const missing: MissingMigration[] = []
  for (const release of releases) {
    const breaking = release.entries.filter((e) => e.breaking)
    if (!breaking.length) continue
    const text = sections.get(release.version)
    const prs = breaking.flatMap((e) => (e.pr ? [e.pr.number] : []))
    const unlinked = text === undefined ? prs : prs.filter((n) => !text.includes(`/pull/${n})`))
    if (text === undefined || unlinked.length) missing.push({ version: release.version, section: text === undefined, prs: unlinked })
  }
  return missing
}
