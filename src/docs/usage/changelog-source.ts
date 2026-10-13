import changelog from '../../../CHANGELOG.md?raw'
import { parseChangelog } from './changes'

/**
 * CHANGELOG.md, parsed once for the docs. The file is release-please's; this
 * imports it with `?raw` at build time, as the Changelog page does, so the
 * component pages and What's new read the same text the Changelog shows.
 */
export const RELEASES = parseChangelog(changelog)
