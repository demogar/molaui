/**
 * STORY-ONLY. Demo content for "Cayuco", a fictional internal knowledge and
 * agent platform, answering questions about a fictional growth experiment.
 * Every name, number and URL here is invented.
 */

export const OPERATOR_QUESTION =
  'Did the puzzle-rush onboarding variant (exp-0412) improve day-7 retention for new players? Should we ship it?'

export const ANSWER = `Yes — with one caveat worth checking before you ship. Variant **B** (puzzle rush as the first screen) lifted day-7 retention from 31.2% to 34.0% across 48,210 new players, and the interval excludes zero [1].

The lift is concentrated in players who self-rated as beginners. For players who imported a rating from another site, the difference is inside the noise [2].

- Day-7 retention: +2.8 pts (95% CI +1.9 to +3.7)
- Puzzles solved in the first session: 11.4 vs 6.1
- Time to first rated game: **slower** by about 40 seconds in B

The slower first game is the caveat. The experiment brief lists \`first_rated_game_s\` as a guardrail metric [3], and B moves it in the wrong direction. I would ship B to beginners only and keep the guardrail on the dashboard for two weeks.`

export const REASONING = `The question has two parts: did retention improve, and is it safe to ship. For the first I need the experiment's primary metric with its interval, not just the point estimate. For the second I need the guardrails from the brief, because "improved retention" is not the same as "safe to ship" if a guardrail moved. I'll query the results table, then read the brief.`

export const SOURCES = [
  {
    id: 1,
    title: 'exp-0412 results — puzzle-rush onboarding',
    href: 'https://example.com/experiments/exp-0412/results',
    domain: 'experiments.cayuco.internal',
    snippet: 'Primary metric d7_retention. Control 31.2%, variant B 34.0%. n = 48,210. Sequential test, alpha 0.05.',
    retrievedAt: '2026-10-05T14:02:00Z',
  },
  {
    id: 2,
    title: 'Segment breakdown: self-rated vs imported rating',
    href: 'https://example.com/experiments/exp-0412/segments',
    domain: 'experiments.cayuco.internal',
    snippet: 'Imported-rating cohort: +0.4 pts (CI −1.1 to +1.9). Beginner cohort: +4.1 pts (CI +2.9 to +5.3).',
    retrievedAt: '2026-10-05T14:02:03Z',
  },
  {
    id: 3,
    title: 'Experiment brief: onboarding v3',
    href: 'https://example.com/docs/briefs/onboarding-v3',
    domain: 'docs.cayuco.internal',
    snippet: 'Guardrails: first_rated_game_s must not regress more than 10%. Crash-free sessions ≥ 99.6%.',
    retrievedAt: '2026-10-05T14:02:05Z',
  },
] as const

export const QUERY_ARGS = {
  experiment_id: 'exp-0412',
  metrics: ['d7_retention', 'puzzles_first_session', 'first_rated_game_s'],
  segments: ['self_rated_beginner', 'imported_rating'],
  confidence: 0.95,
}

export const QUERY_RESULT = {
  rows: 48210,
  d7_retention: { control: 0.312, variant_b: 0.34, ci: [0.019, 0.037] },
  first_rated_game_s: { control: 212, variant_b: 251 },
  computed_at: '2026-10-05T14:02:01Z',
}
