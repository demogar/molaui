/**
 * The agents of the fictional Cayuco "Support" workspace. The names are the
 * agents of the runs fixture (src/components/table/agent-runs.fixture.ts),
 * so this screen and the runs admin screen are one product, not two drawings
 * of it. The runs themselves are not borrowed from that fixture: it assigns
 * agents at random, which gave a paused agent a run from three minutes ago.
 */

export type AgentState = 'live' | 'paused' | 'failing' | 'draft'

export interface Agent {
  id: string
  name: string
  state: AgentState
  model: string
  owner: string
  /** What the agent is for, in its owner's words. */
  purpose: string
  tools: string[]
  knowledge: string | null
  runs24h: number
  /** Percent of runs in the last 7 days that succeeded; null before the first run. */
  successRate: number | null
  /** Daily success rate for the last 7 days, oldest first. */
  trend: number[]
  spend7d: number
  /** Minutes ago; null before the first run. */
  lastRunMinutes: number | null
  createdOn: string
}

export const AGENTS: Agent[] = [
  {
    id: 'agt_support-triage',
    name: 'Support triage',
    state: 'failing',
    model: 'cayuco-steady-3',
    owner: 'Dalia Osei',
    purpose:
      'Reads every new support ticket, tags it by product area and urgency, and routes billing questions straight to the billing queue. It never answers the customer itself.',
    tools: ['search_tickets', 'tag_ticket', 'route_ticket'],
    knowledge: 'Support playbook',
    runs24h: 412,
    successRate: 88.4,
    trend: [97.9, 98.2, 97.6, 96.8, 93.1, 90.2, 88.4],
    spend7d: 61.2,
    lastRunMinutes: 2,
    createdOn: '2026-03-14',
  },
  {
    id: 'agt_docs-answerer',
    name: 'Docs answerer',
    state: 'live',
    model: 'cayuco-deep-3',
    owner: 'Ana Ríos',
    purpose:
      'Answers a customer’s how-to question in two short paragraphs, citing the help article it comes from. Keeps to the docs; says so when a question is not covered.',
    tools: ['fetch_article', 'search_kb'],
    knowledge: 'Help centre',
    runs24h: 1204,
    successRate: 99.1,
    trend: [98.7, 98.9, 99.0, 98.8, 99.2, 99.0, 99.1],
    spend7d: 182.4,
    lastRunMinutes: 1,
    createdOn: '2026-01-22',
  },
  {
    id: 'agt_invoice-checker',
    name: 'Invoice checker',
    state: 'live',
    model: 'cayuco-swift-2',
    owner: 'Hana Sato',
    purpose: 'Checks each new invoice against the account’s plan and usage, and flags any line that does not match.',
    tools: ['lookup_account', 'check_invoice'],
    knowledge: null,
    runs24h: 3310,
    successRate: 99.7,
    trend: [99.6, 99.7, 99.8, 99.7, 99.6, 99.7, 99.7],
    spend7d: 9.8,
    lastRunMinutes: 1,
    createdOn: '2025-11-03',
  },
  {
    id: 'agt_ticket-summariser',
    name: 'Ticket summariser',
    state: 'live',
    model: 'cayuco-steady-3',
    owner: 'Carla Pinzón',
    purpose: 'Writes the three-line summary at the top of every escalated ticket, and refreshes it when the thread changes.',
    tools: ['fetch_ticket'],
    knowledge: 'Support playbook',
    runs24h: 86,
    successRate: 98.2,
    trend: [98.0, 97.5, 98.4, 98.9, 98.1, 98.3, 98.2],
    spend7d: 12.6,
    lastRunMinutes: 14,
    createdOn: '2026-02-09',
  },
  {
    id: 'agt_abuse-report-reviewer',
    name: 'Abuse-report reviewer',
    state: 'paused',
    model: 'cayuco-deep-3',
    owner: 'Bruno Vega',
    purpose:
      'Drafts a first review of each abuse report for a moderator to confirm. Paused while the trust team rewrites its guidelines.',
    tools: ['search_tickets', 'lookup_account', 'draft_review'],
    knowledge: 'Acceptable-use policy',
    runs24h: 0,
    successRate: 96.4,
    trend: [95.8, 96.1, 96.8, 96.4],
    spend7d: 40.1,
    lastRunMinutes: 4 * 24 * 60,
    createdOn: '2025-12-01',
  },
  {
    id: 'agt_release-notes-drafter',
    name: 'Release-notes drafter',
    state: 'live',
    model: 'cayuco-steady-3',
    owner: 'Bruno Vega',
    purpose: 'Turns the week’s merged changes into release notes a customer would want to read, and leaves the jargon out.',
    tools: ['search_changes'],
    knowledge: null,
    runs24h: 3,
    successRate: 100,
    trend: [100, 100, 100, 100, 100, 100, 100],
    spend7d: 1.4,
    lastRunMinutes: 6 * 60,
    createdOn: '2026-05-18',
  },
  {
    id: 'agt_refund-reviewer',
    name: 'Refund reviewer',
    state: 'live',
    model: 'cayuco-deep-3',
    owner: 'Ana Ríos',
    purpose: 'Reviews each refund request against the billing history and recommends approve or decline, with its reason.',
    tools: ['lookup_account', 'search_tickets'],
    knowledge: 'Refund policy',
    runs24h: 640,
    successRate: 97.3,
    trend: [97.0, 97.4, 97.1, 97.6, 97.2, 97.5, 97.3],
    spend7d: 144.9,
    lastRunMinutes: 3,
    createdOn: '2026-04-02',
  },
  {
    id: 'agt_feedback-analyst',
    name: 'Feedback analyst',
    state: 'draft',
    model: 'cayuco-steady-3',
    owner: 'Hana Sato',
    purpose: 'Will read each week’s product feedback and write up what changed, for whom, and how sure we can be.',
    tools: ['query_metrics'],
    knowledge: null,
    runs24h: 0,
    successRate: null,
    trend: [],
    spend7d: 0,
    lastRunMinutes: null,
    createdOn: '2026-10-01',
  },
]

export type RecentRunStatus = 'succeeded' | 'running' | 'failed' | 'cancelled'

export interface RecentRun {
  id: string
  status: RecentRunStatus
  /** Seconds; null while running. */
  duration: number | null
  minutesAgo: number
}

/**
 * The last five runs of an agent, consistent with its state and its "last
 * run" time: a failing agent's history is mostly failures, a paused one
 * stopped days ago, a draft has none. Derived rather than written out so
 * the eight histories cannot drift from the list above.
 */
export function recentRuns(agent: Agent): RecentRun[] {
  if (agent.lastRunMinutes === null) return []
  const pattern: RecentRunStatus[] =
    agent.state === 'failing'
      ? ['failed', 'failed', 'succeeded', 'failed', 'succeeded']
      : agent.state === 'paused'
        ? ['cancelled', 'succeeded', 'succeeded', 'failed', 'succeeded']
        : agent.runs24h > 500
          ? ['running', 'succeeded', 'succeeded', 'succeeded', 'succeeded']
          : ['succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded']
  const gap = Math.max(1, Math.round((24 * 60) / Math.max(agent.runs24h, 5)))
  const seed = [...agent.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return pattern.map((status, i) => ({
    id: `run_${(0x5a3f00 + seed * 131 + i * 7919).toString(16)}`,
    status,
    duration: status === 'running' ? null : 6 + ((seed * (i + 3)) % 240),
    minutesAgo: agent.lastRunMinutes! + i * gap,
  }))
}
