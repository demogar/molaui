/** API keys in the Cayuco Support workspace. Every name and key is invented. */

export type KeyEnvironment = 'live' | 'test'
export type KeyState = 'active' | 'revoked'

export interface ApiKey {
  id: string
  name: string
  /** The prefix and last four characters: all of a key anyone sees after it is created. */
  hint: string
  environment: KeyEnvironment
  createdBy: string
  /** Minutes since a request last used it, or null if none has. */
  lastUsedMinutesAgo: number | null
  /** What breaks when it is revoked, said in the confirmation. */
  usedBy: string
  state: KeyState
}

export const API_KEYS: ApiKey[] = [
  {
    id: 'key_ingest',
    name: 'Help centre sync',
    hint: 'ck_live_…7f2a',
    environment: 'live',
    createdBy: 'Ana Ruiz',
    lastUsedMinutesAgo: 3,
    usedBy: 'The hourly help centre sync',
    state: 'active',
  },
  {
    id: 'key_widget',
    name: 'Support widget',
    hint: 'ck_live_…c91e',
    environment: 'live',
    createdBy: 'Kai Morales',
    lastUsedMinutesAgo: 1,
    usedBy: 'The chat widget on every customer page',
    state: 'active',
  },
  {
    id: 'key_staging',
    name: 'Staging tests',
    hint: 'ck_test_…04b8',
    environment: 'test',
    createdBy: 'Lea Santos',
    lastUsedMinutesAgo: 2_880,
    usedBy: 'The staging test suite',
    state: 'active',
  },
  {
    id: 'key_old-export',
    name: 'Quarterly export',
    hint: 'ck_live_…ee10',
    environment: 'live',
    createdBy: 'Ana Ruiz',
    lastUsedMinutesAgo: 129_600,
    usedBy: 'Nothing in the last 90 days',
    state: 'revoked',
  },
]

export const ADMINS = ['Ana Ruiz', 'Kai Morales']
