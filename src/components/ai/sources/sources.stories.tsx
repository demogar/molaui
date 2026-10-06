import type { Meta, StoryObj } from '@storybook/react-vite'

import { ANSWER, SOURCES } from '../_story-data/fixtures'
import { StreamingText } from '../streaming-text'

import { Citation, SourceList } from './sources'

const meta = {
  title: 'AI/Sources',
  component: SourceList,
  args: { sources: SOURCES },
  parameters: {
    docs: {
      description: {
        component: [
          'A knowledge platform lives or dies on whether people check its sources, so checking one has to cost **one click and no context switch**.',
          '',
          '`Citation` is a cut chip the size of a lowercase letter, tabular and keylined, so a paragraph dense with citations still reads as a paragraph. It links to the matching card below by default (`#source-n`), which keeps the reader on the page. Its accessible name is the source title — “[2]” alone tells a screen reader nothing.',
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
      <StreamingText text={ANSWER} renderCitation={(n) => <Citation n={n} title={SOURCES[n - 1]?.title} />} />
      <SourceList sources={SOURCES} />
    </div>
  ),
}
