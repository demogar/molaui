/**
 * STORY-ONLY. A change the fictional Cayuco research agent proposes after the
 * exp-0412 analysis: roll variant B out to beginners and watch the guardrail.
 */

export const FLAG_DIFF = `diff --git a/flags/onboarding_puzzle_rush.yaml b/flags/onboarding_puzzle_rush.yaml
index 3f2a9c1..8b41d07 100644
--- a/flags/onboarding_puzzle_rush.yaml
+++ b/flags/onboarding_puzzle_rush.yaml
@@ -1,12 +1,14 @@ flag: onboarding_puzzle_rush
 flag: onboarding_puzzle_rush
 owner: growth-onboarding
 description: Puzzle rush as the first screen for new players.

 rollout:
-  variant: control
-  audience: all_new_players
-  percent: 50
+  variant: B
+  audience: self_rated_beginner
+  percent: 100
+  # exp-0412: +4.1 pts d7 retention for beginners, CI +2.9 to +5.3
+  review_after: 2026-10-19

 guardrails:
   - metric: first_rated_game_s
     max_regression: 0.10
@@ -24,6 +26,7 @@ alerts:
   channel: growth-onboarding-alerts
   on:
     - guardrail_breach
+    - crash_free_below_99_6
   quiet_hours: false
 `

export const DASHBOARD_DIFF = `@@ -8,7 +8,8 @@ panels:
   - title: Day-7 retention by cohort
     query: d7_retention_by_cohort
-    window: 28d
+    window: 14d
+    split_by: self_rated_beginner
   - title: Time to first rated game
     query: first_rated_game_s
     alert_threshold: 0.10
`

export const FLAG_CHANGES = [
  { field: 'rollout.variant', before: 'control', after: 'B' },
  { field: 'rollout.audience', before: 'all_new_players', after: 'self_rated_beginner' },
  { field: 'rollout.percent', before: '50', after: '100' },
  { field: 'rollout.review_after', after: '2026-10-19' },
] as const

export const CHANGE_SUMMARY =
  'Variant B lifted day-7 retention for self-rated beginners by 4.1 points and did nothing measurable for players who imported a rating. This rolls B out to beginners only, adds a crash-free alert the brief asks for, and narrows the dashboard window so a guardrail regression shows within two weeks.'
