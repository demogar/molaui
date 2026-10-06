/** The settings of the fictional Cayuco "Support" workspace, as last saved. */

export type ModelId = 'cayuco-deep-3' | 'cayuco-steady-3' | 'cayuco-swift-2'

export interface WorkspaceSettings {
  name: string
  slug: string
  description: string
  defaultModel: ModelId
  /** US dollars a month. */
  monthlyLimit: number | null
  tokensPerRun: number | null
  onLimit: 'pause' | 'notify'
  failedRunEmails: boolean
  weeklyDigest: boolean
  spendAlerts: boolean
}

export type SettingsErrors = Partial<Record<keyof WorkspaceSettings, string>>

export const SAVED_SETTINGS: WorkspaceSettings = {
  name: 'Support',
  slug: 'support',
  description: 'Agents that help customers: triage, docs answers, refunds and the support queue.',
  defaultModel: 'cayuco-steady-3',
  monthlyLimit: 2000,
  tokensPerRun: 40000,
  onLimit: 'pause',
  failedRunEmails: true,
  weeklyDigest: true,
  spendAlerts: true,
}

export const MODELS: { value: ModelId; label: string; description: string }[] = [
  { value: 'cayuco-deep-3', label: 'cayuco-deep-3', description: 'Deep reasoning · slowest, highest cost' },
  { value: 'cayuco-steady-3', label: 'cayuco-steady-3', description: 'Balanced · the platform default' },
  { value: 'cayuco-swift-2', label: 'cayuco-swift-2', description: 'Fast · tagging and classification' },
]

/** What deleting the workspace takes with it — the confirm names every part. */
export const WORKSPACE_CONTENTS = { agents: 8, indexes: 4, documents: 1204 }

/** Other pages of the settings area; leaving to any of them is guarded. */
export const SETTINGS_PAGES = [
  { href: '#settings/general', label: 'General' },
  { href: '#settings/members', label: 'Members' },
  { href: '#settings/api-keys', label: 'API keys' },
  { href: '#settings/billing', label: 'Billing' },
]

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const integer = new Intl.NumberFormat('en-US')

/**
 * Every message says what is wrong and what to do about it. "Invalid value"
 * tells the operator only that they failed.
 */
export function validate(settings: WorkspaceSettings): SettingsErrors {
  const errors: SettingsErrors = {}
  if (!settings.name.trim()) errors.name = 'Enter a workspace name. It is shown in the switcher and on every run.'
  else if (settings.name.trim().length > 40) errors.name = 'Keep the name to 40 characters or fewer.'
  if (!settings.slug) errors.slug = 'Enter a slug. It is the workspace’s address in links and the API.'
  else if (!SLUG.test(settings.slug))
    errors.slug = 'Use lowercase letters, digits and single hyphens only, for example support-team.'
  if (settings.monthlyLimit === null)
    errors.monthlyLimit = 'Set a monthly limit. Without one, runs can spend without a ceiling.'
  else if (settings.monthlyLimit < 50) errors.monthlyLimit = 'The lowest monthly limit is $50.'
  if (settings.tokensPerRun === null) errors.tokensPerRun = 'Set a token limit per run, up to 200,000.'
  else if (settings.tokensPerRun > 200_000)
    errors.tokensPerRun = `A run can use at most ${integer.format(200_000)} tokens. Lower the limit, or split the task across runs.`
  return errors
}
