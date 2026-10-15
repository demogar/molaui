/**
 * Which tests this CI shard runs, from `VISUAL_SHARD=<i>/<n>` (unset: all).
 *
 * Playwright's own `--shard` was used first. It cuts the test list into n
 * contiguous runs, and this suite declares every light screenshot, then every
 * dark one, then the three representative modes, so one shard got only light
 * stories and another got the expensive tail of the dark suite plus all three
 * modes. A round-robin deal over the declared order instead gives every shard
 * the same mix of themes, modes and heavy composed stories: replayed against
 * one run's per-test timings, the contiguous cut was 5% uneven and the deal
 * under 2%. (Most of the gap seen between shards in CI is the runners: in one
 * run the same kind of test took 1.1s on one machine and 1.8s on another,
 * which no split can fix; scripts/ci-budget.mjs reports both.)
 */
const raw = process.env.VISUAL_SHARD ?? '1/1'
const match = /^(\d+)\/(\d+)$/.exec(raw)
const current = Number(match?.[1])
const total = Number(match?.[2])
if (!match || current < 1 || current > total) throw new Error(`VISUAL_SHARD must look like 2/4, not "${raw}"`)

/** Whether the test declared at position `i` (counting from 0) runs here. */
export const mine = (i: number) => i % total === current - 1
