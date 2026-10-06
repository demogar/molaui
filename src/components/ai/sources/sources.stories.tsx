import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../../button'
import { ANSWER, SOURCES } from '../_story-data/fixtures'
import { useSimulatedStream } from '../_story-data/simulate'
import { StreamingText } from '../streaming-text'

import { Citation, SourceList, citationRenderer, type Source } from './sources'

// Built once, at module scope: StreamingText skips finished blocks only while
// the function it is given stays the same.
const cite = citationRenderer(SOURCES)

const meta = {
  title: 'AI/Sources',
  component: SourceList,
  args: { sources: SOURCES },
  parameters: {
    docs: {
      description: {
        component: [
          'A knowledge platform lives or dies on whether people check its sources, so checking one has to cost **no click and no context switch**.',
          '',
          '`Citation` is a cut chip the size of a lowercase letter, tabular and keylined, so a paragraph dense with citations still reads as a paragraph. Its accessible name is the source title — “[2]” alone tells a screen reader nothing.',
          '',
          '- **A card on hover and on focus.** Given its `source`, a marker opens a preview card: number, title, domain, the passage used, when it was read, and a link to the document. It is Base UI’s PreviewCard, which opens on keyboard focus as well as hover, so keyboard readers get the same card. Escape closes it.',
          '- **The card is never the only route.** The marker is still a link to the matching card in the list (`#source-n`), and the preview repeats what that card says, so a reader who never sees it loses nothing.',
          '- **Touch.** There is no hover on a phone, so the first tap opens the card instead of jumping; a second tap on the open marker follows the link, and a tap elsewhere closes it.',
          '- **One numbering.** `citationRenderer(sources)` builds the `renderCitation` for `StreamingText` from the same array `SourceList` renders, so marker [2] always opens source 2. A marker with no matching source stays a plain marker rather than opening an empty card.',
          '',
          '`SourceList` says what each source is, where it lives, the passage that was used (in the reading voice — it is quoted prose), and when it was read: knowledge goes stale, and the date says how stale.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof SourceList>

export default meta
type Story = StoryObj<typeof meta>

export const List: Story = {}

export const InAnAnswer: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-6">
      <StreamingText text={ANSWER} renderCitation={cite} />
      <SourceList sources={SOURCES} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Hover a marker, or Tab to it: the card for that source opens beside the sentence. The list below carries the same numbers.',
      },
    },
  },
}

function StreamedAnswer() {
  const stream = useSimulatedStream(ANSWER, { autoStart: true })
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Button size="sm" variant="secondary" onClick={stream.start}>
          Replay
        </Button>
      </div>
      <StreamingText text={stream.text} status={stream.status} renderCitation={cite} />
      {stream.status === 'done' ? <SourceList sources={SOURCES} /> : null}
    </div>
  )
}

export const Streamed: Story = {
  render: () => <StreamedAnswer />,
  parameters: {
    docs: {
      description: {
        story:
          'Markers become cards the moment their closing bracket arrives, while the rest of the answer is still streaming. The renderer is built once, so finished paragraphs are not re-rendered on every token.',
      },
    },
  },
}

const LONG: Source = {
  id: 4,
  title: 'Retention methodology: how day-7 is counted across time zones, reinstalls and merged accounts',
  href: 'https://example.com/docs/metrics/d7-retention',
  domain: 'docs.cayuco.internal',
  snippet:
    'A player counts as retained on day 7 if they start at least one session between 144 and 192 hours after their first session, measured in UTC. Reinstalls keep the original first-session timestamp. Accounts merged within the window are counted once, under the older account, and the merged account’s sessions are attributed to it from the merge onwards.',
  retrievedAt: '2026-10-05T14:02:08Z',
}

const BARE: Source = {
  id: 5,
  title: 'Guardrail dashboard',
  href: 'https://example.com/dash/onboarding-guardrails',
  domain: 'dash.cayuco.internal',
}

export const LongSnippet: Story = {
  render: () => (
    <p className="m-0 max-w-prose font-text text-lg text-ink">
      Day-7 retention is measured in UTC and counts merged accounts once
      <Citation n={4} source={LONG} />, so the lift is not an artefact of reinstalls.
    </p>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A long title wraps and a long passage is shown whole: the card is as wide as a narrow column and never wider than the screen.',
      },
    },
  },
}

export const WithoutSnippet: Story = {
  render: () => (
    <p className="m-0 max-w-prose font-text text-lg text-ink">
      The guardrail is on the dashboard
      <Citation n={5} source={BARE} /> for the next two weeks.
    </p>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A source with no passage and no read time still says what it is and where it lives; the card simply has fewer rows.',
      },
    },
  },
}
