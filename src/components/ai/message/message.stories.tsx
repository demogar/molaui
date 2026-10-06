import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button } from '../../button'
import { ANSWER, OPERATOR_QUESTION, QUERY_ARGS, QUERY_RESULT, SOURCES } from '../_story-data/fixtures'
import { useSimulatedStream } from '../_story-data/simulate'
import { Citation, SourceList } from '../sources'
import { StreamingText } from '../streaming-text'
import { ToolCall } from '../tool-call'

import { Message } from './message'
import { Thread } from './thread'

const cite = (n: number) => <Citation n={n} title={SOURCES[n - 1]?.title} />

const meta = {
  title: 'AI/Message',
  component: Message,
  args: { role: 'assistant', timestamp: '2026-10-05T14:02:00Z' },
  parameters: {
    docs: {
      description: {
        component: [
          'One turn of a conversation, laid out as a **ledger, not bubbles**.',
          '',
          'Chat bubbles are a messaging idiom: short turns between equals, read on a phone. A transcript in an internal tool is a *record* — answers run to paragraphs, tables and code, and the operator needs who said what, when, with which model. Bubbles would give a long answer 70% of the column and push its code into horizontal scroll. So every turn takes the full measure; the role sits in a gutter in the label register, cut short by its band; a rule separates turns. On a narrow container the gutter stacks above the content.',
          '',
          'The operator’s prompt is Archivo — an instruction, scanned like the rest of the product. The model’s reply is Alegreya — it is read. That asymmetry is what lets a reader find the answers in a long thread at a glance.',
          '',
          'Copy, regenerate and rating appear on hover or focus-within, and always on touch devices. They are hidden by opacity, never `display`, so they stay in the tab order.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof Message>

export default meta
type Story = StoryObj<typeof meta>

export const Conversation: Story = {
  render: () => (
    <div className="max-w-3xl">
      <Message role="user" author="M. Herrera" timestamp="2026-10-05T14:01:40Z">
        {OPERATOR_QUESTION}
      </Message>
      <Message role="tool" author="query_experiment" timestamp="2026-10-05T14:01:58Z">
        <ToolCall name="query_experiment" title="Experiment results" status="succeeded" durationMs={1840} args={QUERY_ARGS} result={QUERY_RESULT} />
      </Message>
      <Message
        role="assistant"
        author="Cayuco"
        model="mola-research-2"
        timestamp="2026-10-05T14:02:06Z"
        copyText={ANSWER}
        onRetry={fn()}
        onFeedback={fn()}
      >
        <StreamingText text={ANSWER} renderCitation={cite} />
        <SourceList sources={SOURCES} className="mt-5" />
      </Message>
    </div>
  ),
}

function StreamingTurn() {
  const stream = useSimulatedStream(ANSWER, { autoStart: true })
  return (
    <div className="max-w-3xl">
      <Button size="sm" variant="secondary" onClick={stream.start} className="mb-3">
        Replay
      </Button>
      <Message
        role="assistant"
        author="Cayuco"
        model="mola-research-2"
        status={stream.status === 'streaming' ? 'streaming' : 'done'}
        copyText={ANSWER}
        onFeedback={fn()}
      >
        <StreamingText text={stream.text} status={stream.status} renderCitation={cite} />
      </Message>
    </div>
  )
}

export const Streaming: Story = {
  render: () => <StreamingTurn />,
  parameters: { docs: { description: { story: 'Actions stay hidden until the answer is complete — rating half an answer is noise.' } } },
}

export const Failed: Story = {
  render: () => (
    <div className="max-w-3xl">
      <Message
        role="assistant"
        author="Cayuco"
        model="mola-research-2"
        status="error"
        error="upstream_timeout: model did not return a token for 30000ms (req_7Hq2c91)"
        onRetry={fn()}
      >
        <StreamingText text={ANSWER.slice(0, 260)} status="error" />
      </Message>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Failure is first-class: what arrived before the failure stays on screen, the failure is said in a sentence, the error is shown verbatim as a literal (operators paste it into tickets), and Retry sits beside it.',
      },
    },
  },
}

export const System: Story = {
  args: { role: 'system', children: 'Context reset. Earlier turns are summarised; attachments from before 13:40 were dropped.' },
}

function LongThread() {
  const [count, setCount] = React.useState(4)
  React.useEffect(() => {
    if (count >= 24) return
    const id = setTimeout(() => setCount((c) => c + 1), 900)
    return () => clearTimeout(id)
  }, [count])
  return (
    <Thread label="Conversation with Cayuco" className="h-[460px] bg-cloth-pale px-4 shadow-cut">
      {Array.from({ length: count }, (_, i) => (
        <Message key={i} role={i % 2 ? 'assistant' : 'user'} author={i % 2 ? 'Cayuco' : 'You'}>
          {i % 2 ? (
            <StreamingText text={`Turn ${i + 1}. ${ANSWER.split('\n\n')[i % 3]}`} />
          ) : (
            `Follow-up question ${i + 1}: what about the imported-rating cohort?`
          )}
        </Message>
      ))}
    </Thread>
  )
}

export const ThreadStickToBottom: Story = {
  name: 'Thread — stick to bottom',
  render: () => <LongThread />,
  parameters: {
    docs: {
      description: {
        story:
          'New turns arrive every second. While you are at the bottom the thread follows them. **Scroll up**: it stops following and offers *Jump to latest*. Scroll back down and it follows again. Auto-scrolling on every token is the most common streaming bug there is.',
      },
    },
  },
}
