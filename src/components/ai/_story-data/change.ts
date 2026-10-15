/**
 * STORY-ONLY. A change the fictional Cayuco research agent proposes after the
 * ro-0412 analysis: roll the help panel out to Starter and watch the guardrail.
 */

export const FLAG_DIFF = `diff --git a/flags/help_panel_v2.yaml b/flags/help_panel_v2.yaml
index 3f2a9c1..8b41d07 100644
--- a/flags/help_panel_v2.yaml
+++ b/flags/help_panel_v2.yaml
@@ -1,12 +1,14 @@ flag: help_panel_v2
 flag: help_panel_v2
 owner: support-experience
 description: In-app help panel for new workspaces.

 rollout:
-  variant: control
-  audience: all_new_workspaces
-  percent: 50
+  variant: panel
+  audience: plan_starter
+  percent: 100
+  # ro-0412: -6.1 tickets per 1,000 on Starter, CI -7.4 to -4.8
+  review_after: 2026-10-19

 guardrails:
   - metric: time_to_first_reply_s
     max_regression: 0.10
@@ -24,6 +26,7 @@ alerts:
   channel: support-experience-alerts
   on:
     - guardrail_breach
+    - escalation_rate_above_4
   quiet_hours: false
 `

export const DASHBOARD_DIFF = `@@ -8,7 +8,8 @@ panels:
   - title: Tickets per 1,000 by plan
     query: tickets_per_1k_by_plan
-    window: 28d
+    window: 14d
+    split_by: plan_starter
   - title: Time to first reply
     query: time_to_first_reply_s
     alert_threshold: 0.10
`

export const FLAG_CHANGES = [
  { field: 'rollout.variant', before: 'control', after: 'panel' },
  { field: 'rollout.audience', before: 'all_new_workspaces', after: 'plan_starter' },
  { field: 'rollout.percent', before: '50', after: '100' },
  { field: 'rollout.review_after', after: '2026-10-19' },
] as const

/** The triage agent's system prompt, and the research agent's revision of it after ro-0412. */
export const PROMPT_BEFORE = `You are the Cayuco support triage agent.

Read each new ticket and assign one queue: billing, access, data, or general.
Reply to the customer within two minutes with an acknowledgement.
If the ticket mentions an outage, page the on-call engineer.

Tone: friendly, brief, no jargon.
Never promise a resolution time.
Sign every reply as "Cayuco Support".`

export const PROMPT_AFTER = `You are the Cayuco support triage agent.

Read each new ticket and assign one queue: billing, access, data, onboarding, or general.
For workspaces on the Starter plan created in the last 14 days, link the matching help panel article before anything else (see ro-0412: −6.1 tickets per 1,000).
Reply to the customer within two minutes with an acknowledgement.
If the ticket mentions an outage, page the on-call engineer.

Tone: friendly, brief, no jargon.
Never promise a resolution time.
Sign every reply as "Cayuco Support".`

export const CHANGE_SUMMARY =
  'The help panel cut tickets from Starter workspaces by 6.1 per 1,000 and did nothing measurable for Enterprise workspaces. This rolls the panel out to Starter only, adds an escalation alert the brief asks for, and narrows the dashboard window so a guardrail regression shows within two weeks.'
