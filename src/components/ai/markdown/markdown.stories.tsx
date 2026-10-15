import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../../button'
import { MARKDOWN_ANSWER, SOURCES } from '../_story-data/fixtures'
import { useSimulatedStream } from '../_story-data/simulate'
import { SourceList, citationRenderer } from '../sources'

import { Markdown } from './markdown'

// Built once, at module scope: finished blocks skip re-rendering only while
// the renderer stays the same function.
const renderCitation = citationRenderer(SOURCES)

const meta = {
  title: 'AI/Markdown',
  tags: ['experimental'],
  component: Markdown,
  args: { text: MARKDOWN_ANSWER, status: 'done', renderCitation },
  argTypes: {
    status: { control: 'inline-radio', options: ['idle', 'streaming', 'done', 'error'] },
    renderCitation: { control: false },
  },
  decorators: [(Story) => <div className="max-w-reading">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'A model’s answer written in Markdown, streamed and rendered in Mola’s typography, with its `[n]` citation markers kept as `Citation`s.',
          '',
          '- **Citations survive.** A Markdown library behind `StreamingText` reads `[2]` as text or as a broken link. Here the markers are part of the grammar and go through `renderCitation`, so `citationRenderer(sources)` gives each one its preview card.',
          '- **Three voices.** Paragraphs, lists and quotes are Alegreya, because the model is talking. Headings return to the system voice, as in `Prose`. Code is a Martian Mono literal, and a fenced block is a `CodeBlock` with copy, wrap and the scroll-edge cue. A table is a Mola `Table`, so at 320px it scrolls sideways inside its frame instead of widening the page.',
          '- **Never HTML.** The parser builds plain objects that React renders as text: `<script>` in an answer is shown, never run. Links keep their href only for http(s), mailto and relative paths, and an absolute link opens in a new tab and says so.',
          '- **Streaming-safe.** A marker still open at the end of the stream renders closed, so “**Star” is bold at once rather than two asterisks that vanish a token later. An unclosed fence is a code block that grows. Finished blocks are parsed once and memoised, as in `StreamingText`.',
          '- **An in-house parser, on purpose.** The subset a model writes, about 2 kB gzipped, instead of a general library that would cost tens of kilobytes or emit HTML strings. Setext headings, indented code, reference links, footnotes and raw HTML stay as text.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof Markdown>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <Markdown {...args} />
      <section aria-labelledby="markdown-sources" className="flex flex-col gap-2">
        <h3 id="markdown-sources" className="m-0 rotulo text-ink-2">
          Sources
        </h3>
        <SourceList sources={SOURCES} timeZone="UTC" />
      </section>
    </div>
  ),
}

function Live() {
  const stream = useSimulatedStream(MARKDOWN_ANSWER, { autoStart: true, intervalMs: 30 })
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <Button size="sm" onClick={stream.start}>
          Replay
        </Button>
        <Button size="sm" variant="secondary" onClick={stream.stop} disabled={stream.status !== 'streaming'}>
          Stop
        </Button>
      </div>
      <Markdown text={stream.text} status={stream.status} renderCitation={renderCitation} />
    </div>
  )
}

export const Streaming: Story = {
  render: () => <Live />,
  parameters: {
    docs: {
      description: {
        story:
          'Watch the table, the list and the fence arrive. Bold text is bold from its first letter, a link shows its words while its address is still arriving, and the code block grows inside its frame.',
      },
    },
  },
}

export const MidStream: Story = {
  args: {
    status: 'streaming',
    text: 'The drop is concentrated in **Starter workspa',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Frozen mid-token. The `**` has not closed yet, and the text is already bold: the caret follows it, and nothing restyles when the closing marker arrives.',
      },
    },
  },
}

export const OpenFence: Story = {
  args: {
    status: 'streaming',
    text: 'Use the segment filter on the results query:\n\n```sql\nselect plan, avg(tickets_7d)\nfrom ro_0412_assi',
  },
  parameters: {
    docs: {
      description: {
        story: 'An unclosed fence is the normal state mid-stream: it is a code block that runs to the end of the text, never a parse error.',
      },
    },
  },
}

export const UntrustedInput: Story = {
  args: {
    renderCitation: undefined,
    text: [
      'A model can be talked into writing markup. None of it runs:',
      '',
      '- <img src=x onerror="alert(1)"> stays as text.',
      '- [A javascript: link](javascript:alert(1)) keeps its words and loses its href.',
      '- [A relative link](#sources) and [an external one](https://example.com/rollouts) stay links.',
      '',
      'Without `renderCitation`, a marker stays as text: [1].',
    ].join('\n'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Raw HTML is shown as characters, a `javascript:` link renders as its text, and only http(s), mailto and relative links keep an href. Without `renderCitation`, `[1]` is left as written.',
      },
    },
  },
}

export const Muted: Story = {
  args: {
    variant: 'muted',
    renderCitation: undefined,
    text: 'The question has two parts: did tickets drop, and is it *safe* to roll out. I’ll query `ro_0412_results`, then read the brief.',
  },
}
