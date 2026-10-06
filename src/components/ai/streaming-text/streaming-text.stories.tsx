import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { Button } from '../../button'
import { tokenize, useSimulatedStream } from '../_story-data/simulate'
import { ANSWER } from '../_story-data/fixtures'

import { StreamingText } from './streaming-text'

const meta = {
  title: 'AI/Streaming text',
  component: StreamingText,
  args: { text: ANSWER, status: 'done' },
  argTypes: { status: { control: 'inline-radio', options: ['idle', 'streaming', 'done', 'error'] } },
  parameters: {
    docs: {
      description: {
        component: [
          'Text that arrives a token at a time.',
          '',
          '- **The reading voice.** A model’s answer is set in Alegreya because it is *read* — several paragraphs, at the reader’s pace. The chrome is Archivo; anything the machine *did* (a tool, an argument, an id) is a Martian Mono literal, because it is *inspected*. A reader can tell from the letterforms alone whether they are looking at the model talking, the model acting, or the product.',
          '- **No layout shift.** Text only grows at its end, and the block caret is a fixed-width inline box after the last glyph, so nothing above it reflows. A block caret reads as *output being written*; a thin bar would read as a field waiting for input.',
          '- **Announced once.** A live region on the text would read every token aloud. Instead the text is `aria-busy` while it streams and a separate polite status says “Response complete.” at the end.',
          '- **Cost grows with the block, not the answer.** Finished blocks are parsed once and kept, and each is a memoised component, so a chunk re-parses and re-renders only the block still arriving. Re-parsing from the top made every token cost the length of the answer before it: in jsdom, 20,000 tokens arriving four at a time took 67 s and rendered finished citations about a million times; now it takes 8 s and about 1,400. Pass `renderCitation` as a stable function, or finished blocks render again.',
          '- **Reduced motion.** The caret stops blinking and stays — still true, since text is still arriving.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof StreamingText>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {}

function Live() {
  const stream = useSimulatedStream(ANSWER, { autoStart: true })
  return (
    <div className="flex max-w-prose flex-col gap-5">
      <div className="flex gap-2">
        <Button size="sm" onClick={stream.start}>
          Replay
        </Button>
        <Button size="sm" variant="secondary" onClick={stream.stop} disabled={stream.status !== 'streaming'}>
          Stop
        </Button>
      </div>
      <StreamingText text={stream.text} status={stream.status} />
    </div>
  )
}

export const Streaming: Story = {
  render: () => <Live />,
  parameters: {
    docs: {
      description: {
        story:
          'Irregular cadence on purpose — real models burst and stall, and a UI tested only against a metronome hides the jank a stall-then-burst produces.',
      },
    },
  },
}

export const WaitingForFirstToken: Story = {
  args: { text: '', status: 'streaming' },
  parameters: {
    docs: {
      description: {
        story: 'Before the first token the caret alone holds the line, so the answer’s first line does not pop in and push content down.',
      },
    },
  },
}

export const WithCode: Story = {
  args: {
    text: 'Use the segment filter on the results query:\n\n```sql\nselect cohort, avg(d7_retained)\nfrom exp_0412_assignments\ngroup by cohort;\n```\n\nThen compare against `first_rated_game_s`.',
  },
}

export const Muted: Story = {
  args: { tone: 'muted', text: 'The question has two parts: did retention improve, and is it safe to ship.' },
}

// Twelve tokens every 16 ms: 20,000 tokens in under half a minute, which is
// faster than any model streams and so a fair test of the per-chunk cost.
function useFirehose(full: string, perTick = 12) {
  const tokens = React.useMemo(() => tokenize(full), [full])
  const [count, setCount] = React.useState(0)
  const [run, setRun] = React.useState(1)
  React.useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.min(tokens.length, c + perTick)), 16)
    return () => clearInterval(id)
  }, [tokens.length, perTick, run])
  return {
    text: tokens.slice(0, count).join(''),
    count,
    total: tokens.length,
    restart: () => {
      setCount(0)
      setRun((r) => r + 1)
    },
  }
}

const LONG = (() => {
  const block = `${ANSWER}\n\n\`\`\`sql\nselect cohort, avg(d7_retained)\nfrom exp_0412_assignments\ngroup by cohort;\n\`\`\`\n\n`
  let text = ''
  while (tokenize(text).length < 20_000) text += block
  return tokenize(text).slice(0, 20_000).join('')
})()

function LongStream() {
  const stream = useFirehose(LONG)
  const done = stream.count >= stream.total
  return (
    <div className="flex max-w-prose flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={stream.restart}>
          Replay
        </Button>
        <span className="font-ui text-sm tabular text-ink-muted">
          {stream.count.toLocaleString('en-US')} of {stream.total.toLocaleString('en-US')} tokens
        </span>
      </div>
      <div
        tabIndex={0}
        role="region"
        aria-label="Long answer"
        className="scroll-cloth max-h-[28rem] overflow-y-auto bg-cloth-pale p-4 shadow-cut"
      >
        <StreamingText text={stream.text} status={done ? 'done' : 'streaming'} className="text-base" />
      </div>
    </div>
  )
}

export const LongAnswer: Story = {
  render: () => <LongStream />,
  parameters: {
    docs: {
      description: {
        story:
          'Twenty thousand tokens, twelve every 16 ms. The settled blocks are parsed once and never re-render, so the last paragraph streams as smoothly as the first. Before the fix, the same stream slowed visibly as the answer grew.',
      },
    },
  },
}
