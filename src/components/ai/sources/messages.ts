/** The words Citation and SourceList say on their own. */
export interface SourcesMessages {
  /** A citation marker's accessible name when the source's title is known. `{n}` is its number, `{name}` its title. */
  citationNamed: string
  /** A citation marker's accessible name without a title. `{n}` is its number. */
  citation: string
  /** The link at the foot of a citation's preview card. */
  openSource: string
  /** Read after "Open source" by a screen reader, since the link leaves the page. `{n}` is the source's number. */
  openSourceDetail: string
  /** When the source was read. `{time}` is the date and time, written in the locale. */
  retrieved: string
}

export const sourcesMessages: SourcesMessages = {
  citationNamed: 'Source {n}: {name}',
  citation: 'Source {n}',
  openSource: 'Open source',
  openSourceDetail: '{n} (opens in a new tab)',
  retrieved: 'read {time}',
}
