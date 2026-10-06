/**
 * Forty agent runs on a fictional internal platform, for stories and tests.
 * Generated from a fixed seed so every render, screenshot and test sees the
 * same rows — a fixture that reshuffles on reload cannot be reviewed.
 */

export type RunStatus = 'succeeded' | 'running' | 'failed' | 'queued' | 'cancelled'

export interface AgentRun {
  id: string
  agent: string
  status: RunStatus
  model: string
  tokens: number
  cost: number
  /** Seconds. Null while queued. */
  duration: number | null
  startedAt: Date
}

/** The moment every "3m ago" in the fixtures is measured from. */
export const FIXTURE_NOW = new Date('2026-10-05T18:00:00Z')

const AGENTS = [
  'Opening explainer',
  'Puzzle tagger',
  'Support triage',
  'Lesson summariser',
  'Cheat-report reviewer',
  'Release-notes drafter',
  'Coach feedback',
  'Experiment analyst',
]
const MODELS = ['cayuco-deep-3', 'cayuco-steady-3', 'cayuco-swift-2']
/** Finished runs only: what is still running or queued is decided by recency. */
const SETTLED: RunStatus[] = [
  'succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded', 'succeeded',
  'failed', 'failed', 'cancelled',
]

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeAgentRuns(count = 40, seed = 7): AgentRun[] {
  const rand = mulberry32(seed)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!
  let minutesAgo = 1
  return Array.from({ length: count }, (_, i) => {
    const status: RunStatus = i === 0 ? 'queued' : i < 4 ? 'running' : pick(SETTLED)
    const model = pick(MODELS)
    const tokens = status === 'queued' ? 0 : Math.round(800 + rand() * 48_000)
    const rate = model.includes('deep') ? 0.000045 : model.includes('steady') ? 0.000012 : 0.000003
    minutesAgo += Math.round(1 + rand() * 38)
    return {
      id: `run_${(0x5a3f00 + i * 7919 + Math.floor(rand() * 4096)).toString(16)}`,
      agent: pick(AGENTS),
      status,
      model,
      tokens,
      cost: Math.round(tokens * rate * 10_000) / 10_000,
      duration: status === 'queued' ? null : Math.round(4 + rand() * 410),
      startedAt: new Date(FIXTURE_NOW.getTime() - minutesAgo * 60_000),
    }
  })
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

export function formatRelative(date: Date, now = FIXTURE_NOW): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
