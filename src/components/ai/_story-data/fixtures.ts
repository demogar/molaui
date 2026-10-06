/**
 * STORY-ONLY. Demo content for "Cayuco", a fictional internal knowledge and
 * agent platform, answering questions about a fictional support rollout.
 * Every name, number and URL here is invented.
 */

export const OPERATOR_QUESTION =
  'Did the in-app help panel (flag help_panel_v2, rollout ro-0412) cut support tickets from new workspaces? Should we roll it out to everyone?'

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
    href: 'https://example.com/rollouts/ro-0412/results',
    domain: 'rollouts.cayuco.internal',
    snippet: 'Primary metric tickets_per_1k. Control 31.2, help panel 27.0. n = 48,210. Sequential test, alpha 0.05.',
    retrievedAt: '2026-10-05T14:02:00Z',
  },
  {
    id: 2,
    title: 'Segment breakdown: Starter vs Enterprise plan',
    href: 'https://example.com/rollouts/ro-0412/segments',
    domain: 'rollouts.cayuco.internal',
    snippet: 'Enterprise cohort: −0.4 per 1,000 (CI −1.9 to +1.1). Starter cohort: −6.1 per 1,000 (CI −7.4 to −4.8).',
    retrievedAt: '2026-10-05T14:02:03Z',
  },
  {
    id: 3,
    title: 'Rollout brief: help panel v2',
    href: 'https://example.com/docs/briefs/help-panel-v2',
    domain: 'docs.cayuco.internal',
    snippet: 'Guardrails: time_to_first_reply_s must not regress more than 10%. Escalation rate ≤ 4%.',
    retrievedAt: '2026-10-05T14:02:05Z',
  },
] as const

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
