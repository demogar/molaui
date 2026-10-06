import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '../badge'
import { DescriptionList } from './description-list'

const meta = {
  title: 'Components/Data display/Description list',
  component: DescriptionList,
  parameters: {
    docs: {
      description: {
        component:
          'Term and value pairs: the properties panel of every run, document and experiment. Three layouts for three reading tasks — **inline** for a side panel scanned top to bottom, **stacked** for values long enough to wrap, **grid** for a summary closing a section. Values marked `literal` are set in the machine face so an id is never mistaken for prose.',
      },
    },
  },
  args: {
    layout: 'inline',
    items: [
      { term: 'Run', detail: 'run_5a9e19', literal: true },
      { term: 'Status', detail: <Badge tone="success" dot>Succeeded</Badge> },
      { term: 'Model', detail: 'cayuco-steady-3', literal: true },
      { term: 'Tokens', detail: '42,933' },
      { term: 'Cost', detail: '$0.5152' },
      { term: 'Duration', detail: '2m 03s' },
    ],
  },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof DescriptionList>

export default meta
type Story = StoryObj<typeof meta>

export const Inline: Story = {}

export const Stacked: Story = {
  args: {
    layout: 'stacked',
    items: [
      { term: 'Agent', detail: 'Opening explainer' },
      {
        term: 'System prompt',
        detail:
          'Explain the opening the player just played in two sentences, name the main idea, and suggest one line to study next. Never mention engine evaluations above +3.',
      },
      { term: 'Source', detail: 'knowledge/openings/sicilian-najdorf.md', literal: true },
      { term: 'Owner', detail: 'Learning squad' },
    ],
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
}

export const Grid: Story = {
  args: {
    layout: 'grid',
    items: [
      { term: 'Hypothesis', detail: 'A post-game coach note lifts day-7 return.' },
      { term: 'Audience', detail: '10% of new players, rated under 1200' },
      { term: 'Primary metric', detail: 'Day-7 return rate' },
      { term: 'Guardrail', detail: 'Support tickets per 1,000 players' },
    ],
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
}
