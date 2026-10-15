import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DescriptionList } from '../description-list'
import { RelativeTime } from './relative-time'

// Stories pin "now" so every screenshot reads the same distances.
const NOW = Date.parse('2026-10-14T09:12:00Z')
const minutes = (n: number) => NOW - n * 60_000

const RUNS = [
  { id: 'run_8f2c', agent: 'Support triage', status: 'Succeeded', at: minutes(0.7) },
  { id: 'run_8f1a', agent: 'Refund review', status: 'Failed', at: minutes(14) },
  { id: 'run_8e77', agent: 'Knowledge sync', status: 'Succeeded', at: minutes(3 * 60 + 5) },
  { id: 'run_8d02', agent: 'Support triage', status: 'Succeeded', at: minutes(26 * 60) },
  { id: 'run_8a90', agent: 'Eval sweeper', status: 'Cancelled', at: minutes(9 * 24 * 60) },
]

const meta = {
  title: 'Components/Data display/Relative time',
  tags: ['experimental'],
  component: RelativeTime,
  parameters: {
    docs: {
      description: {
        component:
          'A moment as its distance from now — "3 minutes ago", "in 2 days", "yesterday" — in a `<time>` whose `dateTime` holds the exact moment and whose `title` shows it to a pointer. The words come from `Intl.RelativeTimeFormat` for the `locale`, truncated so it never claims more time has passed than has.\n\n' +
          'Pass `now` to render on the server and keep the text still (the page owns time); omit it and the server writes the exact moment in UTC, and the browser takes over after hydration and keeps the text current. A live time sets one timer for the moment its text next changes, and none while the tab is hidden. It is not a live region: a screen reader hears the current text when it reaches it, never a minute-by-minute announcement.',
      },
    },
  },
  args: { date: minutes(3), now: NOW, locale: 'en-US' },
} satisfies Meta<typeof RelativeTime>

export default meta
type Story = StoryObj<typeof meta>

export const RunList: Story = {
  name: 'In a list of runs',
  parameters: {
    docs: {
      description: {
        story:
          'The last runs of a Cayuco workspace. `format="narrow"` keeps the column short ("14m ago"); `numeric="auto"` says "yesterday" rather than "1 day ago". The exact moment is in each `title`, in the zone given by `timeZone`.',
      },
    },
  },
  render: () => (
    <ul className="m-0 grid max-w-md list-none gap-0 p-0">
      {RUNS.map((run) => (
        <li key={run.id} className="flex items-baseline justify-between gap-4 border-t border-keyline py-2 first:border-t-0">
          <span className="min-w-0">
            <span className="block text-sm text-ink">{run.agent}</span>
            <span className="literal text-xs text-ink-muted">{run.id}</span>
          </span>
          <span className="shrink-0 text-xs text-ink-muted">
            {run.status} · <RelativeTime date={run.at} now={NOW} locale="en-US" format="narrow" timeZone="UTC" />
          </span>
        </li>
      ))}
    </ul>
  ),
}

export const Formats: Story = {
  name: 'Formats and numeric style',
  parameters: {
    docs: {
      description: {
        story:
          '`long` for prose, `short` and `narrow` for tables and meta lines. `numeric="always"` writes "1 day ago" where `auto` writes "yesterday": use it when a column of numbers should stay a column of numbers.',
      },
    },
  },
  render: () => (
    <DescriptionList
      className="max-w-sm"
      items={[
        { term: 'long', detail: <RelativeTime date={minutes(3)} now={NOW} locale="en-US" /> },
        { term: 'short', detail: <RelativeTime date={minutes(3)} now={NOW} locale="en-US" format="short" /> },
        { term: 'narrow', detail: <RelativeTime date={minutes(3)} now={NOW} locale="en-US" format="narrow" /> },
        { term: 'auto', detail: <RelativeTime date={minutes(24 * 60)} now={NOW} locale="en-US" /> },
        { term: 'always', detail: <RelativeTime date={minutes(24 * 60)} now={NOW} locale="en-US" numeric="always" /> },
        { term: 'future', detail: <RelativeTime date={minutes(-2 * 24 * 60 - 30)} now={NOW} locale="en-US" /> },
      ]}
    />
  ),
}

export const Locales: Story = {
  name: 'Words by locale',
  parameters: {
    docs: {
      description: {
        story: 'The same three minutes, and the same yesterday, from `Intl` for each locale; nothing is a table of English words.',
      },
    },
  },
  render: () => (
    <DescriptionList
      className="max-w-sm"
      items={(['en-GB', 'es-PA', 'ko-KR', 'ar-EG'] as const).map((locale) => ({
        term: locale,
        detail: (
          <>
            <RelativeTime date={minutes(3)} now={NOW} locale={locale} />
            {' · '}
            <RelativeTime date={minutes(24 * 60)} now={NOW} locale={locale} />
          </>
        ),
      }))}
    />
  ),
}

function LiveDemo() {
  // Three minutes before the page opened, read once: the story's own clock.
  const [startedAt] = useState(() => Date.now() - 3 * 60_000)
  return (
    <p className="m-0 text-sm text-ink-2">
      Last sync <RelativeTime date={startedAt} locale="en-US" />
    </p>
  )
}

export const Live: Story = {
  name: 'Live, from the browser clock',
  parameters: {
    docs: {
      description: {
        story:
          'No `now`: the text follows the browser clock and moves on at the next minute. Switch tabs and come back after a while; the text is right on the first frame, because a hidden tab schedules nothing and a shown one re-reads the clock at once.',
      },
    },
  },
  render: () => <LiveDemo />,
}
