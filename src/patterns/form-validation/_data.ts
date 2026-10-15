/** The fictional Cayuco "refund reviewer" agent's configuration, and what its form offers. */

export const MODELS = [
  { value: 'cayuco-deep-3', label: 'Cayuco Deep 3', description: 'Deep reasoning · slowest' },
  { value: 'cayuco-steady-3', label: 'Cayuco Steady 3', description: 'Balanced · default' },
  { value: 'cayuco-swift-2', label: 'Cayuco Swift 2', description: 'Fast · classification' },
]

export const TOOLS = [
  { value: 'search_tickets', description: 'Query the ticket archive by account, tag or date.' },
  { value: 'fetch_ticket', description: 'Read one ticket with its full thread.' },
  { value: 'lookup_account', description: 'Read an account’s plan and billing. Rate-limited.' },
]

export const TEAMMATES = [
  { value: 'ana-rios', label: 'Ana Ríos', description: 'Evaluation' },
  { value: 'bruno-vega', label: 'Bruno Vega', description: 'Platform' },
  { value: 'carla-pinzon', label: 'Carla Pinzón', description: 'Evaluation' },
  { value: 'dalia-osei', label: 'Dalia Osei', description: 'Safety' },
  { value: 'hana-sato', label: 'Hana Sato', description: 'Retrieval' },
]

export const ON_FAILURE = [
  { value: 'retry', label: 'Retry, then continue' },
  { value: 'skip', label: 'Skip the step' },
  { value: 'halt', label: 'Halt the run' },
]

/** Who may change an agent's configuration, named to someone who cannot. */
export const OWNERS = ['Ana Ríos', 'Bruno Vega']

// Pinned so the calendar is the same in every screenshot.
export const TODAY = new Date(2026, 9, 6)

/** The configuration as saved, for the read-only view. */
export const SAVED_AGENT = {
  name: 'refund-reviewer',
  model: 'cayuco-steady-3',
  prompt: 'You are the refund reviewer. Answer only from the refund policy, and hand anything over $100 to a person.',
  temperature: 0.3,
  budget: 40_000,
  goLive: new Date(2026, 9, 12),
  reviewers: ['ana-rios', 'dalia-osei'],
  documents: ['refund-policy-2026.pdf'],
  tools: ['search_tickets', 'fetch_ticket'],
  onFailure: 'retry',
  stream: true,
}
