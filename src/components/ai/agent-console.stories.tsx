import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowRight, ChevronDown } from 'lucide-react'
import * as React from 'react'

import { Button } from '../button'

import { ANSWER, OPERATOR_QUESTION, QUERY_ARGS, QUERY_RESULT, REASONING, SOURCES } from './_story-data/fixtures'
import { RUN_LENGTH, deriveSteps, partial, stepProgress, stepWindow } from './_story-data/run-script'
import { useStoryClock } from './_story-data/simulate'
import { AgentRun } from './agent-run'
import { Confidence, UncertaintyNote } from './confidence'
import { Message, Thread } from './message'
import { PromptInput } from './prompt-input'
import { Reasoning } from './reasoning'
import type { RunStatusValue } from './run-status'
import { Citation, SourceList } from './sources'
import { StreamingText } from './streaming-text'
import { TokenUsage } from './token-usage'
import { ToolCall } from './tool-call'

const meta = {
  title: 'AI/Agent console',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Every AI component, composed into a working console for **Cayuco**, a fictional internal knowledge-and-agent platform. Ask it something (or pick a suggestion): the agent plans, calls two tools, and streams a cited answer, while the run panel on the right shows the same work as a timeline with live clocks and token usage. Press **Stop** mid-answer to see cancellation; the transcript keeps what arrived.',
          '',
          'The demo content — a puzzle-rush onboarding experiment — is invented, and the answer is scripted: there is no model behind this page.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

interface Turn {
  id: number
  question: string
  base: number
  /** Story-clock time this turn started at. */
  t0: number
  /** Run time at which the operator stopped it. */
  stoppedAt?: number
  feedback?: 'up' | 'down'
}

const USAGE_PER_TURN = { input: 18_420, output: 1_204, cached: 12_800, costUsd: 0.0731 }
const SUGGESTIONS = [OPERATOR_QUESTION, 'Which guardrails did onboarding v3 define, and did any of them regress?']

const cite = (n: number) => <Citation n={n} title={SOURCES[n - 1]?.title} />

function AssistantTurn({ t, base, stopped, onRetry, feedback, onFeedback }: {
  t: number
  base: number
  stopped: boolean
  onRetry: () => void
  feedback?: 'up' | 'down'
  onFeedback: (v: 'up' | 'down') => void
}) {
  const plan = stepWindow('plan')
  const query = stepWindow('query')
  const brief = stepWindow('brief')
  const answer = stepWindow('answer')
  const done = t >= RUN_LENGTH
  const toolStatus = (w: { start: number; end: number }): RunStatusValue =>
    t >= w.end ? 'succeeded' : stopped ? 'cancelled' : 'running'

  return (
    <Message
      role="assistant"
      author="Cayuco"
      model="mola-research-2"
      timestamp={new Date(base)}
      status={done || stopped ? 'done' : 'streaming'}
      copyText={done ? ANSWER : undefined}
      onRetry={done || stopped ? onRetry : undefined}
      feedback={feedback}
      onFeedback={done ? onFeedback : undefined}
    >
      <div className="flex flex-col gap-3">
        <Reasoning
          text={partial(REASONING, stepProgress(t, 'plan'))}
          status={t >= plan.end || stopped ? 'done' : 'streaming'}
          startedAt={base}
          endedAt={t >= plan.end ? base + plan.end : stopped ? base + t : undefined}
        />
        {t >= query.start ? (
          <ToolCall
            name="query_experiment"
            title="Experiment results"
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
            title="Experiment brief"
            status={toolStatus(brief)}
            startedAt={base + brief.start}
            endedAt={t >= brief.end ? base + brief.end : stopped ? base + t : undefined}
            args={{ query: 'onboarding v3 guardrails', top_k: 3 }}
            result={t >= brief.end ? '3 passages · docs.cayuco.internal/briefs/onboarding-v3' : undefined}
          />
        ) : null}
        {t >= answer.start ? (
          <StreamingText
            className="mt-2"
            text={partial(ANSWER, stepProgress(t, 'answer'))}
            status={done ? 'done' : stopped ? 'done' : 'streaming'}
            renderCitation={cite}
          />
        ) : null}
        {stopped && !done ? <p className="m-0 rotulo text-ink-muted">Stopped by you</p> : null}
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

function AgentConsole() {
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [draft, setDraft] = React.useState('')
  const last = turns.at(-1)
  const clock = useStoryClock(true, 100)

  const runT = (turn: Turn) => Math.min(RUN_LENGTH, turn.stoppedAt ?? clock.t - turn.t0)
  const lastT = last ? runT(last) : 0
  const generating = last !== undefined && last.stoppedAt === undefined && lastT < RUN_LENGTH

  const ask = (question: string) =>
    setTurns((all) => [...all, { id: all.length + 1, question, base: Date.now(), t0: clock.t }])

  const stop = () =>
    setTurns((all) => all.map((turn, i) => (i === all.length - 1 ? { ...turn, stoppedAt: clock.t - turn.t0 } : turn)))

  const finishedTurns = turns.filter((turn) => runT(turn) >= RUN_LENGTH).length
  const runStatus: RunStatusValue = !last ? 'queued' : last.stoppedAt !== undefined && lastT < RUN_LENGTH ? 'cancelled' : lastT >= RUN_LENGTH ? 'succeeded' : 'running'
  const steps = last
    ? deriveSteps(lastT, last.base).map((step) => {
        // The answer is already in the transcript; the run panel shows the
        // work, not a second copy of the words.
        const base = { ...step, defaultOpen: false, detail: step.kind === 'message' ? undefined : step.detail }
        return last.stoppedAt !== undefined && (step.status === 'running' || step.status === 'streaming')
          ? { ...base, status: 'cancelled' as const, endedAt: last.base + lastT }
          : base
      })
    : []

  return (
    <div className="grid h-dvh min-h-[640px] grid-rows-[auto_minmax(0,1fr)] bg-cloth text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-ink bg-cloth-pale px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-6 place-items-center bg-ink">
            <span className="size-3 bg-rojo shadow-[0_0_0_2px_var(--oro)]" />
          </span>
          <p className="m-0 font-display text-base font-bold tracking-display wdth-display">Cayuco</p>
          <span className="rotulo text-ink-muted">Knowledge agent</span>
        </div>
        <span className="literal hidden text-xs text-ink-muted sm:inline">workspace: growth-analytics</span>
      </header>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <main className="flex min-h-0 flex-col">
          {turns.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="flex max-w-lg flex-col gap-5">
                <h1 className="m-0 font-display text-2xl leading-tight font-bold tracking-display wdth-display">
                  Ask about an experiment, a metric or a brief.
                </h1>
                <p className="m-0 font-text text-lg text-ink-2">
                  Cayuco reads the experiment warehouse and the docs archive, cites what it used, and asks before it changes anything.
                </p>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="group flex w-full items-start gap-3 bg-cloth-pale p-3 text-start font-ui text-sm text-ink shadow-cut band-oro [--cut-reveal:3px] transition-shadow duration-(--motion-cut) ease-cut hover:cut-band"
                    >
                      <span className="flex-1">{s}</span>
                      <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted group-hover:text-ink rtl:-scale-x-100" />
                    </button>
                  ))}
                </div>
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
            <PromptInput
              className="mx-auto max-w-3xl"
              label="Message Cayuco"
              placeholder="Ask about an experiment, a metric, a brief…"
              value={draft}
              onValueChange={setDraft}
              status={generating ? 'generating' : 'idle'}
              onSubmit={ask}
              onStop={stop}
              toolbar={
                <Button size="sm" variant="ghost" className="normal-case tracking-normal">
                  <span className="literal text-xs">mola-research-2</span>
                  <ChevronDown />
                </Button>
              }
            />
          </div>
        </main>

        <aside aria-label="Run details" className="scroll-cloth flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-ink bg-cloth-shade p-4 lg:border-t-0 lg:border-s">
          {last ? (
            <AgentRun
              name="Cayuco research agent"
              runId={`run_01JA4R7M${String(last.id).padStart(4, '0')}`}
              model="mola-research-2"
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
              <p className="m-0 font-ui text-sm text-ink-2">No run yet. Ask a question and the agent’s steps appear here as it works.</p>
            </div>
          )}
          <section aria-labelledby="usage-heading" className="flex flex-col gap-3 bg-cloth-pale p-4 shadow-cut">
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

export const Console: Story = {
  render: () => <AgentConsole />,
}
