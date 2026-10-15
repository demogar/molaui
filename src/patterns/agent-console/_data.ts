/**
 * The console's scripted conversation: a fictional Cayuco knowledge agent
 * answering a question about a fictional support rollout. Every name,
 * number and URL here is invented.
 *
 * A copy, not an import, of the AI stories' fixtures in
 * src/components/ai/_story-data/: a pattern is copied into a product by
 * itself, so it may lean only on what the package exports, and the story
 * harness is not exported (see agent-console.tsx).
 */

export const OPERATOR_QUESTION =
  'Did the in-app help panel (flag help_panel_v2, rollout ro-0412) cut support tickets from new workspaces? Should we roll it out to everyone?'

export const SUGGESTIONS = [OPERATOR_QUESTION, 'Which guardrails did help panel v2 define, and did any of them regress?']

export const ANSWER = `Yes — with one caveat worth checking before you roll out. The help panel cut support tickets from new workspaces from 31.2 to 27.0 per 1,000 across 48,210 new workspaces, and the interval excludes zero [1].

The drop is concentrated in workspaces on the Starter plan. For Enterprise workspaces, the difference is inside the noise [2].

- Tickets per 1,000 new workspaces: −4.2 (95% CI −5.3 to −3.1)
- Help articles read in the first week: 11.4 vs 6.1
- Time to first reply: **slower** by about 40 seconds with the panel

The slower first reply is the caveat. The rollout brief lists \`time_to_first_reply_s\` as a guardrail metric [3], and the panel moves it in the wrong direction. I would roll the panel out to Starter workspaces only and keep the guardrail on the dashboard for two weeks.`

export const REASONING = `The question has two parts: did tickets drop, and is it safe to roll out. For the first I need the rollout's primary metric with its interval, not just the point estimate. For the second I need the guardrails from the brief, because "fewer tickets" is not the same as "safe to roll out" if a guardrail moved. I'll query the results table, then read the brief.`

export const SOURCES = [
  {
    id: 1,
    title: 'ro-0412 results — in-app help panel',
    href: 'https://rollouts.cayuco.internal/ro-0412/results',
    domain: 'rollouts.cayuco.internal',
    snippet: 'Primary metric tickets_per_1k. Control 31.2, help panel 27.0. n = 48,210. Sequential test, alpha 0.05.',
    retrievedAt: '2026-10-05T14:02:00Z',
  },
  {
    id: 2,
    title: 'Segment breakdown: Starter vs Enterprise plan',
    href: 'https://rollouts.cayuco.internal/ro-0412/segments',
    domain: 'rollouts.cayuco.internal',
    snippet: 'Enterprise cohort: −0.4 per 1,000 (CI −1.9 to +1.1). Starter cohort: −6.1 per 1,000 (CI −7.4 to −4.8).',
    retrievedAt: '2026-10-05T14:02:03Z',
  },
  {
    id: 3,
    title: 'Rollout brief: help panel v2',
    href: 'https://docs.cayuco.internal/briefs/help-panel-v2',
    domain: 'docs.cayuco.internal',
    snippet: 'Guardrails: time_to_first_reply_s must not regress more than 10%. Escalation rate ≤ 4%.',
    retrievedAt: '2026-10-05T14:02:05Z',
  },
]

export const QUERY_ARGS = {
  rollout_id: 'ro-0412',
  metrics: ['tickets_per_1k', 'help_articles_first_week', 'time_to_first_reply_s'],
  segments: ['plan_starter', 'plan_enterprise'],
  confidence: 0.95,
}

export const QUERY_RESULT = {
  rows: 48210,
  tickets_per_1k: { control: 31.2, help_panel: 27.0, ci: [-5.3, -3.1] },
  time_to_first_reply_s: { control: 212, help_panel: 251 },
  computed_at: '2026-10-05T14:02:01Z',
}

export const BRIEF_ARGS = { query: 'help panel v2 guardrails', top_k: 3 }
export const BRIEF_RESULT = '3 passages · docs.cayuco.internal/briefs/help-panel-v2'

/** What the warehouse says when the query times out, verbatim. */
export const QUERY_ERROR = 'WarehouseTimeout: query on analytics.ro_0412_results exceeded 30s (request req_7c41e0)'

/** Who can give someone the right to ask the agent, named to someone who cannot. */
export const ADMINS = ['Ana Ruiz', 'Kai Morales']

/** Tokens and cost of one finished turn, for the session's usage. */
export const USAGE_PER_TURN = { input: 18_420, output: 1_204, cached: 12_800, costUsd: 0.0731 }

/**
 * The scripted run, in milliseconds from the question: plan, two tool
 * calls, then the answer. Each step's state at time `t` is derived from
 * these windows, so stopping, failing and replaying are all "derive again
 * at another `t`", and every frame is reproducible.
 */
export const SCRIPT = {
  plan: { start: 0, end: 2400 },
  query: { start: 2400, end: 4300 },
  brief: { start: 4300, end: 5400 },
  answer: { start: 5400, end: 10_200 },
} as const

export type StepId = keyof typeof SCRIPT

export const RUN_LENGTH = SCRIPT.answer.end

/** Run time at which the query times out, in a run that fails. */
export const FAILS_AT = 3_200
