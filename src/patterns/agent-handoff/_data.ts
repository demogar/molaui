/** One escalated ticket in the Cayuco Support workspace. Every name, id and amount is invented. */

export interface Handoff {
  ticket: string
  subject: string
  customer: string
  agent: string
  model: string
  runId: string
  /** When the run started; every step's time is an offset from it. */
  startedAt: Date
  invoice: string
  amountUsd: number
  /** What the agent may refund on its own. */
  agentLimitUsd: number
  customerMessage: string
  /** Why the agent stopped, in its own words. */
  reason: string
  confidenceBasis: string
  draftReply: string
  /** Who may approve a refund this size. */
  approvers: string[]
}

export const HANDOFF: Handoff = {
  ticket: 'CX-4821',
  subject: 'Refund for a double charge',
  customer: 'Tomás Ortega',
  agent: 'Support triage',
  model: 'cayuco-steady-3',
  runId: 'run_7c41e09a2f',
  // Five minutes ago, so the run's clocks read the same in every screenshot,
  // where the browser's clock is frozen, and plausibly anywhere else.
  startedAt: new Date(Date.now() - 5 * 60_000),
  invoice: 'INV-2026-0311',
  amountUsd: 240,
  agentLimitUsd: 100,
  customerMessage:
    'I was charged twice for my March invoice, $240 each time, a few seconds apart. Can you refund the second one?',
  reason:
    'The second charge is a duplicate: same card, same invoice, four seconds apart. I drafted a refund and a reply, but $240.00 is over the $100.00 I can refund on my own, so a person has to approve it.',
  confidenceBasis: 'Both charges are in the billing ledger, 4 seconds apart',
  draftReply:
    'Hi Tomás, you are right: your March invoice was charged twice. I have refunded the second charge of $240.00, and it will be back on your card within five working days. Sorry for the trouble.',
  approvers: ['Kai Morales', 'Ana Ruiz'],
}

export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
