/** Knowledge sources in the Cayuco Support workspace. Every name is invented. */

export type SourceKind = 'Help centre' | 'Drive folder' | 'Website' | 'Upload'
export type SyncState = 'synced' | 'syncing' | 'failed'

export interface KnowledgeSource {
  id: string
  name: string
  kind: SourceKind
  documents: number
  /** Minutes since the last finished sync, or null while the first one runs. */
  syncedMinutesAgo: number | null
  state: SyncState
}

export const SOURCES: KnowledgeSource[] = [
  { id: 'src_help-centre', name: 'Cayuco help centre', kind: 'Help centre', documents: 412, syncedMinutesAgo: 14, state: 'synced' },
  { id: 'src_refund-policy', name: 'Refund and billing policy', kind: 'Drive folder', documents: 23, syncedMinutesAgo: 62, state: 'synced' },
  { id: 'src_status-page', name: 'Status page history', kind: 'Website', documents: 1_208, syncedMinutesAgo: null, state: 'syncing' },
  { id: 'src_macros', name: 'Support macros', kind: 'Upload', documents: 86, syncedMinutesAgo: 2_880, state: 'failed' },
  { id: 'src_release-notes', name: 'Release notes', kind: 'Website', documents: 154, syncedMinutesAgo: 240, state: 'synced' },
]

/** Who can grant access, named, because "contact your administrator" names nobody. */
export const ADMINS = ['Ana Ruiz', 'Kai Morales']
