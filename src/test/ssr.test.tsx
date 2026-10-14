import { act, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentRun } from '../components/ai/agent-run'
import { Message } from '../components/ai/message'
import { Reasoning } from '../components/ai/reasoning'
import { RunError } from '../components/ai/run-error'
import { RunStatus } from '../components/ai/run-status'
import { SourceList } from '../components/ai/sources'
import { Calendar } from '../components/date-picker'

/**
 * Server rendering, then hydration, of every component that shows a clock or
 * a time: the server and the browser must write the same text.
 *
 * The two renders are made to disagree the way they do in production: the
 * browser runs a second and a half later than the server, in another time
 * zone, on the other side of midnight. A component that seeds `Date.now()`
 * or the local zone into its first render then writes different text on each
 * side, and React 19 answers that by discarding the server HTML and
 * re-rendering the whole root — reported through `onRecoverableError`, and in
 * development through a console error, so both count as a failure here.
 */
const SERVER_NOW = Date.parse('2026-05-04T23:59:58.500Z')
const CLIENT_NOW = SERVER_NOW + 1_500
const STARTED = SERVER_NOW - 12_400

const originalTz = process.env.TZ
// Testing Library sets this for its own render; hydrateRoot is called directly here.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.useRealTimers()
  process.env.TZ = originalTz
})

async function hydrateAgainstServer(ui: () => ReactElement) {
  vi.useFakeTimers({ toFake: ['Date'] })

  process.env.TZ = 'UTC'
  vi.setSystemTime(SERVER_NOW)
  const html = renderToString(ui())

  process.env.TZ = 'Asia/Tokyo'
  vi.setSystemTime(CLIENT_NOW)
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.append(container)

  const problems: string[] = []
  const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    problems.push(args.map(String).join(' '))
  })
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(async () => {
      root = hydrateRoot(container, ui(), {
        onRecoverableError: (error) => problems.push(String(error)),
      })
    })
  } finally {
    consoleError.mockRestore()
  }
  const hydrated = container.innerHTML
  act(() => root?.unmount())
  container.remove()
  return { html, hydrated, problems }
}

describe('server rendering and hydration', () => {
  it('is set up to catch a mismatch', async () => {
    // The harness itself: a component that writes the local time straight
    // into its first render must be caught, or every test below proves nothing.
    const Naive = () => <p>{new Date().toLocaleTimeString('en-US')}</p>
    const { problems } = await hydrateAgainstServer(() => <Naive />)
    expect(problems.join('\n')).toMatch(/hydrat|server/i)
  })

  const cases: [string, () => ReactElement][] = [
    ['RunStatus, running', () => <RunStatus status="running" startedAt={STARTED} />],
    ['RunStatus, finished', () => <RunStatus status="succeeded" startedAt={STARTED} endedAt={STARTED + 3_000} />],
    ['Reasoning, thinking', () => <Reasoning text="Checking the rollout window." status="streaming" startedAt={STARTED} />],
    [
      'AgentRun, a step in progress',
      () => (
        <AgentRun
          name="Cayuco research agent"
          runId="run_8f2c"
          status="running"
          startedAt={STARTED}
          steps={[
            { id: 'a', kind: 'tool', title: 'Read the rollout plan', status: 'succeeded', startedAt: STARTED, endedAt: STARTED + 2_000 },
            { id: 'b', kind: 'tool', title: 'Query error rates', status: 'running', startedAt: STARTED + 2_000 },
          ]}
        />
      ),
    ],
    ['RunError, waiting to retry', () => <RunError kind="rate_limited" retryAt={SERVER_NOW + 24_000} onRetry={() => {}} />],
    ['Message, in the reader’s zone', () => <Message role="assistant" timestamp={new Date(STARTED)}>Done.</Message>],
    [
      'Message, in a given zone',
      () => (
        <Message role="assistant" timestamp={new Date(STARTED)} timeZone="UTC">
          Done.
        </Message>
      ),
    ],
    [
      'SourceList',
      () => (
        <SourceList
          sources={[{ id: 1, title: 'Rollout runbook', href: '#', domain: 'docs.cayuco.dev', retrievedAt: new Date(STARTED) }]}
        />
      ),
    ],
    // A calendar's starting month cannot wait for hydration without a blank
    // grid in the server HTML, so under SSR it takes `today` from the server
    // (see the prop's doc comment). With it, it must hydrate cleanly.
    ['Calendar, with today', () => <Calendar today={new Date(Date.UTC(2026, 4, 4, 12))} />],
  ]

  it.each(cases)('%s hydrates without a mismatch', async (_name, ui) => {
    const { problems } = await hydrateAgainstServer(ui)
    expect(problems).toEqual([])
  })

  it('shows a clock after hydration, not only on the server', async () => {
    const { html, hydrated } = await hydrateAgainstServer(() => <RunStatus status="running" startedAt={STARTED} />)
    expect(html).not.toMatch(/\d+\.\ds/)
    expect(hydrated).toMatch(/1[34]\.\ds/)
  })

  it('writes a message time into the server HTML when given a zone', async () => {
    const { html } = await hydrateAgainstServer(() => (
      <Message role="assistant" timestamp={new Date(STARTED)} timeZone="UTC">
        Done.
      </Message>
    ))
    expect(html).toContain('11:59 PM')
  })
})
