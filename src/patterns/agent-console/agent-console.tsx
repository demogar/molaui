import { ArrowRight, ChevronDown } from 'lucide-react'
import * as React from 'react'

import { AgentRun, type AgentStep } from '../../components/ai/agent-run'
import { Confidence, UncertaintyNote } from '../../components/ai/confidence'
import { Message, Thread } from '../../components/ai/message'
import { PromptInput } from '../../components/ai/prompt-input'
import { Reasoning } from '../../components/ai/reasoning'
import type { RunStatusValue } from '../../components/ai/run-status'
import { SourceList, citationRenderer } from '../../components/ai/sources'
import { StreamingText } from '../../components/ai/streaming-text'
import { TokenUsage } from '../../components/ai/token-usage'
import { ToolCall } from '../../components/ai/tool-call'
import { Button } from '../../components/button'
import { Callout } from '../../components/callout'
import {
  ADMINS,
  ANSWER,
  BRIEF_ARGS,
  BRIEF_RESULT,
  FAILS_AT,
  QUERY_ARGS,
  QUERY_ERROR,
  QUERY_RESULT,
  REASONING,
  RUN_LENGTH,
  SCRIPT,
  SOURCES,
  type StepId,
  SUGGESTIONS,
  USAGE_PER_TURN,
} from './_data'

/**
 * The agent console: every AI component composed into one working screen
 * for Cayuco, a fictional knowledge-and-agent platform. Ask it something and
 * the agent plans, calls two tools and streams a cited answer, while the run
 * panel beside the transcript shows the same work as a timeline.
 *
 * ── a pattern that owns its script ──
 * The console was a showcase under AI/, driven by the story harness in
 * src/components/ai/_story-data/ (fixtures, a run script, a story clock).
 * Moving it under Patterns meant choosing: export that harness from the
 * package, or give the screen its own run. Exporting it was rejected: it
 * would ship demo code to every consumer and put fixtures in the public
 * API, where they would be versioned and deprecated like real parts. So
 * the screen owns a small scripted run here (the windows in _data.ts and
 * the derivation below), in a folder the JS build leaves out, and imports
 * only what the package exports. In a product, `t` comes from the stream,
 * not from a timer, and the derivation is replaced by the transport's
 * events; everything the reader copies, the layout and the decisions, is
 * unchanged. No AI showcase story is kept: nothing needs one.
 *
 * ── one record, two views ──
 * The transcript is what was said; the run panel is what was done. The
 * answer is not repeated in the panel, whose message step has no detail:
 * the panel shows the work, not a second copy of the words. Stopping the
 * run keeps what arrived in both, marked as stopped by the person.
 *
 * ── a failure is said once ──
 * When a tool call fails, the transcript's turn says so as an error with
 * the tool's message verbatim and Retry; that is the one alert. The run
 * panel states the failed step with its glyph and word and offers Retry
 * run, without a second alert for the same failure.
 *
 * ── someone who may not ask ──
 * A person who can read the workspace but not use its agent sees the
 * console without a composer to type into and be refused: in its place a
 * callout names who can give them access, and the suggestions are not
 * offered as buttons.
 *
 * One screen tall only from `lg`, where the transcript and the run panel
 * sit side by side and each scrolls inside itself. Below it they stack, and
 * a fixed-height grid made them share one row: at 390px the composer was
 * painted over the run panel's empty state. Stacked, the page scrolls.
 */

interface Turn {
  id: number
  question: string
  /**
   * Wall-clock time the turn was asked. A held turn is backdated by the hold,
   * so its steps' times are in the past and the run's elapsed clock agrees
   * with them; asked "now", the held answer step started in the future and
   * read 0.0s.
   */
  base: number
  /** Clock time this turn started at. */
  t0: number
  /** Run time at which the person stopped it. */
  stoppedAt?: number
  /** This attempt's query times out at FAILS_AT. */
  fails?: boolean
  feedback?: 'up' | 'down'
}

export interface AgentConsoleScreenProps {
  /** Whether this person may ask the agent. Someone who may not reads the console without a composer. */
  canAsk?: boolean
  /** Open with this question already asked. */
  defaultQuestion?: string
  /** The first run's query times out, and Retry then succeeds. */
  failFirstRun?: boolean
  /** Hold the run at this many ms into the script, for stories and screenshots. */
  holdAt?: number
}

/** Word-sized pieces, with their trailing space, so a partial answer ends on a whole word. */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? []
}

function partial(text: string, progress: number) {
  const tokens = tokenize(text)
  return tokens.slice(0, Math.ceil(tokens.length * Math.min(1, progress))).join('')
}

function progress(t: number, id: StepId) {
  const w = SCRIPT[id]
  return Math.max(0, Math.min(1, (t - w.start) / (w.end - w.start)))
}

/**
 * A clock that advances only until `endsAt`, the clock time the current run
 * will be over, so nothing ticks on an idle screen. `null` when no run is
 * going (none asked, stopped, or held for a story).
 */
function useRunClock(endsAt: number | null, tickMs = 100) {
  const [t, setT] = React.useState(0)
  const running = endsAt !== null && t < endsAt
  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setT((v) => v + tickMs), tickMs)
    return () => window.clearInterval(id)
  }, [running, tickMs])
  return t
}

const cite = citationRenderer(SOURCES)

function AssistantTurn({
  t,
  base,
  stopped,
  failed,
  onRetry,
  feedback,
  onFeedback,
}: {
  t: number
  base: number
  stopped: boolean
  failed: boolean
  onRetry: () => void
  feedback?: 'up' | 'down'
  onFeedback: (v: 'up' | 'down') => void
}) {
  const { plan, query, brief, answer } = SCRIPT
  const done = t >= RUN_LENGTH
  const toolStatus = (w: { start: number; end: number }): RunStatusValue =>
    t >= w.end ? 'succeeded' : stopped ? 'cancelled' : 'running'

  return (
    <Message
      role="assistant"
      author="Cayuco"
      model="cayuco-deep-3"
      timestamp={new Date(base)}
      status={failed ? 'error' : done || stopped ? 'done' : 'streaming'}
      error={failed ? `query_rollout failed. ${QUERY_ERROR}` : undefined}
      copyText={done ? ANSWER : undefined}
      onRetry={done || stopped || failed ? onRetry : undefined}
      feedback={feedback}
      onFeedback={done ? onFeedback : undefined}
    >
      <div className="flex flex-col gap-3">
        <Reasoning
          text={partial(REASONING, progress(t, 'plan'))}
          status={t >= plan.end || stopped ? 'done' : 'streaming'}
          startedAt={base}
          endedAt={t >= plan.end ? base + plan.end : stopped ? base + t : undefined}
        />
        {/* A failed call is reported by the turn's error, once; its own
            error block would be a second alert for the same failure. */}
        {t >= query.start && !failed ? (
          <ToolCall
            name="query_rollout"
            title="Rollout results"
            status={toolStatus(query)}
            startedAt={base + query.start}
            endedAt={t >= query.end ? base + query.end : stopped ? base + t : undefined}
            args={QUERY_ARGS}
            result={t >= query.end ? QUERY_RESULT : undefined}
          />
        ) : null}
        {t >= brief.start ? (
          <ToolCall
            name="search_docs"
            title="Rollout brief"
            status={toolStatus(brief)}
            startedAt={base + brief.start}
            endedAt={t >= brief.end ? base + brief.end : stopped ? base + t : undefined}
            args={BRIEF_ARGS}
            result={t >= brief.end ? BRIEF_RESULT : undefined}
          />
        ) : null}
        {t >= answer.start ? (
          <StreamingText
            className="mt-2"
            text={partial(ANSWER, progress(t, 'answer'))}
            status={done || stopped ? 'done' : 'streaming'}
            renderCitation={cite}
          />
        ) : null}
        {stopped && !done ? <p className="m-0 etiqueta text-sm text-ink-muted">Stopped by you</p> : null}
        {done ? (
          <>
            <UncertaintyNote title="Unverified figure">
              The 40-second slowdown comes from one summary row; the per-day data was not available. Check it before you ship.
            </UncertaintyNote>
            <SourceList sources={SOURCES} />
            <Confidence level="medium" basis="the guardrail and the headline disagree" />
          </>
        ) : null}
      </div>
    </Message>
  )
}

const TITLES: Record<StepId, string> = {
  plan: 'Plan the answer',
  query: 'Query the rollout results',
  brief: 'Read the rollout brief',
  answer: 'Write the answer',
}

/** The run panel's steps at run time `t`: the work, not the words, so the answer step has no detail. */
function runSteps(t: number, base: number, turn: Turn): AgentStep[] {
  const failed = turn.fails === true && t >= FAILS_AT
  const ids = (Object.keys(SCRIPT) as StepId[]).filter((id) => !failed || SCRIPT[id].start <= FAILS_AT)
  return ids.map((id) => {
    const w = SCRIPT[id]
    const kind: AgentStep['kind'] = id === 'plan' ? 'reasoning' : id === 'answer' ? 'message' : 'tool'
    let status: RunStatusValue = t >= w.end ? 'succeeded' : t >= w.start ? (kind === 'message' ? 'streaming' : 'running') : 'queued'
    if (failed && id === 'query') status = 'failed'
    if (turn.stoppedAt !== undefined && (status === 'running' || status === 'streaming')) status = 'cancelled'
    const ended = status === 'succeeded' ? base + w.end : status === 'failed' ? base + FAILS_AT : status === 'cancelled' ? base + t : undefined
    const started = status === 'queued' ? undefined : base + w.start
    const detail =
      status === 'queued' || status === 'failed'
        ? undefined
        : id === 'plan'
          ? <Reasoning text={partial(REASONING, progress(t, 'plan'))} status={status === 'succeeded' ? 'done' : 'streaming'} startedAt={started} endedAt={ended} />
          : id === 'query'
            ? <ToolCall name="query_rollout" status={status} startedAt={started} endedAt={ended} args={QUERY_ARGS} result={status === 'succeeded' ? QUERY_RESULT : undefined} />
            : id === 'brief'
              ? <ToolCall name="search_docs" status={status} startedAt={started} endedAt={ended} args={BRIEF_ARGS} result={status === 'succeeded' ? BRIEF_RESULT : undefined} />
              : undefined
    return { id, kind, title: TITLES[id], status, startedAt: started, endedAt: ended, detail, defaultOpen: false }
  })
}

export function AgentConsoleScreen({ canAsk = true, defaultQuestion, failFirstRun = false, holdAt }: AgentConsoleScreenProps) {
  const [turns, setTurns] = React.useState<Turn[]>(() =>
    defaultQuestion ? [{ id: 1, question: defaultQuestion, base: Date.now() - (holdAt ?? 0), t0: 0, fails: failFirstRun }] : [],
  )
  const [draft, setDraft] = React.useState('')
  const failNext = React.useRef(failFirstRun && !defaultQuestion)
  const last = turns.at(-1)

  // Run time of a turn at clock time `clock`: held, stopped, failed or finished turns stop counting.
  const end = (turn: Turn) => (turn.fails ? FAILS_AT : RUN_LENGTH)
  const timeOf = (turn: Turn, clock: number) => holdAt ?? Math.min(end(turn), turn.stoppedAt ?? clock - turn.t0)
  const lastActive = (clock: number) => last !== undefined && last.stoppedAt === undefined && timeOf(last, clock) < end(last)

  const clock = useRunClock(last && last.stoppedAt === undefined && holdAt === undefined ? last.t0 + end(last) : null)
  const generating = lastActive(clock)

  const runT = (turn: Turn) => timeOf(turn, clock)
  const lastT = last ? runT(last) : 0

  const ask = (question: string) => {
    const fails = failNext.current
    failNext.current = false
    setTurns((all) => [...all, { id: all.length + 1, question, base: Date.now() - (holdAt ?? 0), t0: clock, fails }])
  }

  const stop = () =>
    setTurns((all) => all.map((turn, i) => (i === all.length - 1 ? { ...turn, stoppedAt: clock - turn.t0 } : turn)))

  const lastFailed = last?.fails === true && lastT >= FAILS_AT
  const finishedTurns = turns.filter((turn) => !turn.fails && runT(turn) >= RUN_LENGTH).length
  const runStatus: RunStatusValue = !last
    ? 'queued'
    : lastFailed
      ? 'failed'
      : last.stoppedAt !== undefined && lastT < RUN_LENGTH
        ? 'cancelled'
        : lastT >= RUN_LENGTH
          ? 'succeeded'
          : 'running'
  const steps = last ? runSteps(lastT, last.base, last) : []

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-cloth text-ink lg:h-dvh lg:min-h-[640px] lg:grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex items-center justify-between gap-4 border-b border-ink bg-cloth-pale px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-6 place-items-center bg-ink">
            <span className="size-3 bg-accent" />
          </span>
          <p className="m-0 font-display text-base font-bold tracking-display wdth-display">Cayuco</p>
          <span className="rotulo text-ink-muted">Knowledge agent</span>
        </div>
        <span className="literal hidden text-xs text-ink-muted sm:inline">workspace: support-ops</span>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <main className="flex min-h-0 flex-col">
          {turns.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="flex max-w-lg flex-col gap-5">
                <h1 className="m-0 font-display text-2xl leading-tight font-bold tracking-display wdth-display">
                  {canAsk ? 'Ask about a rollout, a metric or a brief.' : 'Cayuco answers questions about rollouts, metrics and briefs.'}
                </h1>
                <p className="m-0 font-text text-lg text-ink-2">
                  Cayuco reads the rollout warehouse and the docs archive, cites what it used, and asks before it changes anything.
                </p>
                {canAsk ? (
                  <div className="flex flex-col items-start gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => ask(s)}
                        className="group flex w-full items-start gap-3 bg-cloth-pale p-3 text-start font-ui text-sm text-ink shadow-cut band-oro [--cut-reveal:3px] transition-shadow hover:cut-band"
                      >
                        <span className="flex-1">{s}</span>
                        <ArrowRight aria-hidden className="mt-0.5 size-(--icon) shrink-0 text-ink-muted group-hover:text-ink flip-rtl" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <Thread label="Conversation with Cayuco" className="flex-1 px-4 lg:px-8">
              <div className="mx-auto max-w-3xl">
                {turns.map((turn) => (
                  <React.Fragment key={turn.id}>
                    <Message role="user" author="M. Herrera" timestamp={new Date(turn.base)}>
                      {turn.question}
                    </Message>
                    <AssistantTurn
                      t={runT(turn)}
                      base={turn.base}
                      stopped={turn.stoppedAt !== undefined}
                      failed={turn.fails === true && runT(turn) >= FAILS_AT}
                      onRetry={() => ask(turn.question)}
                      feedback={turn.feedback}
                      onFeedback={(feedback) => setTurns((all) => all.map((x) => (x.id === turn.id ? { ...x, feedback } : x)))}
                    />
                  </React.Fragment>
                ))}
              </div>
            </Thread>
          )}
          <div className="border-t border-keyline px-4 py-3 lg:px-8">
            {canAsk ? (
              <PromptInput
                className="mx-auto max-w-3xl"
                label="Message Cayuco"
                placeholder="Ask about a rollout, a metric, a brief…"
                value={draft}
                onValueChange={setDraft}
                status={generating ? 'generating' : 'idle'}
                onSubmit={ask}
                onStop={stop}
                toolbar={
                  <Button size="sm" variant="ghost">
                    <span className="literal text-xs">cayuco-deep-3</span>
                    <ChevronDown />
                  </Button>
                }
              />
            ) : (
              <Callout tone="info" variant="flat" headingLevel={2} title="You can read this workspace, not ask its agent" className="mx-auto max-w-3xl">
                Asking Cayuco needs the Agent user role in support-ops. {ADMINS.join(' or ')} can give it to you.
              </Callout>
            )}
          </div>
        </main>

        <aside aria-label="Run details" className="scroll-cloth flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-ink bg-cloth-shade p-4 lg:border-t-0 lg:border-s">
          {last ? (
            <AgentRun
              name="Cayuco research agent"
              runId={`run_01JA4R7M${String(last.id).padStart(4, '0')}`}
              model="cayuco-deep-3"
              status={runStatus}
              startedAt={last.base}
              endedAt={runStatus === 'running' ? undefined : last.base + lastT}
              steps={steps}
              onCancel={stop}
              onRetry={() => ask(last.question)}
              headingLevel={2}
            />
          ) : (
            <div className="relleno-field flex min-h-40 items-center justify-center bg-cloth-shade p-6 text-center shadow-cut">
              <p className="m-0 font-ui text-sm text-ink-2">
                {canAsk ? 'No run yet. Ask a question and the agent’s steps appear here as it works.' : 'No run yet. Runs started by people with access appear here.'}
              </p>
            </div>
          )}
          <section aria-labelledby="usage-heading" className="flex flex-col gap-3 bg-cloth-pale p-4 cut-frame">
            <h2 id="usage-heading" className="m-0 font-display text-base font-bold tracking-display wdth-display">
              Session usage
            </h2>
            <TokenUsage
              input={USAGE_PER_TURN.input * finishedTurns + (generating ? Math.round(USAGE_PER_TURN.input * Math.min(1, lastT / 5400)) : 0)}
              output={USAGE_PER_TURN.output * finishedTurns + (generating ? Math.round(USAGE_PER_TURN.output * Math.max(0, (lastT - 5400) / 4800)) : 0)}
              cached={USAGE_PER_TURN.cached * finishedTurns}
              costUsd={USAGE_PER_TURN.costUsd * finishedTurns}
              contextWindow={200_000}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
