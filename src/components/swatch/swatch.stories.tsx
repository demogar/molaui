import type { Meta, StoryObj } from '@storybook/react-vite'

import { Swatch } from './swatch'

const TONES = ['neutral', 'info', 'success', 'warn', 'danger', 'accent'] as const

const meta = {
  title: 'Components/Data display/Swatch',
  tags: ['stable'],
  component: Swatch,
  args: { tone: 'danger', size: 'md', shape: 'square' },
  argTypes: {
    tone: { control: 'inline-radio', options: TONES },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    shape: { control: 'inline-radio', options: ['square', 'round'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A colour key: the small square that ties a label to a colour used elsewhere — map pins, a column of urgencies, a chart series. It is **always decorative** (`aria-hidden`, no label prop), so the word beside it carries the meaning and colour is never alone. Tones are the badge tones; `warn` is the darkened gold that clears 3:1 on cloth, and `accent` is the field gold with an ink keyline. **Square** by default, because the system has no radius; `round` only to key something that is itself a dot. For a state mark inside a badge, use StatusDot.',
      },
    },
  },
} satisfies Meta<typeof Swatch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <p className="flex items-center gap-2 text-sm text-ink">
      <Swatch {...args} />
      Urgent
    </p>
  ),
}

export const Tones: Story = {
  parameters: {
    docs: { description: { story: 'Every tone at both sizes, each beside the word it keys.' } },
  },
  render: () => (
    <ul className="grid gap-2 text-sm text-ink">
      {TONES.map((tone) => (
        <li key={tone} className="flex items-center gap-3">
          <Swatch tone={tone} size="sm" />
          <Swatch tone={tone} />
          <Swatch tone={tone} shape="round" />
          <span className="capitalize">{tone}</span>
        </li>
      ))}
    </ul>
  ),
}

export const MapLegend: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Round, because the pins it keys are round. The list is named, so the legend is announced as a list of three words and the colours stay silent.',
      },
    },
  },
  render: () => (
    <ul aria-label="Map legend" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      <li className="flex items-center gap-1.5">
        <Swatch tone="danger" shape="round" />
        Urgent
      </li>
      <li className="flex items-center gap-1.5">
        <Swatch tone="warn" shape="round" />
        Needs supplies
      </li>
      <li className="flex items-center gap-1.5">
        <Swatch tone="info" shape="round" />
        Stocked
      </li>
    </ul>
  ),
}

export const GroupHeading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A key before a group label, so each group reads in the same colour as its pins and rows.',
      },
    },
  },
  render: () => (
    <div className="grid max-w-sm gap-4">
      <div className="grid gap-1.5">
        <p className="m-0 flex items-center gap-2 rotulo text-ink">
          <Swatch tone="danger" />
          Urgent
        </p>
        <ul className="m-0 grid gap-1 ps-4.5 text-sm text-ink">
          <li className="list-disc">Drinking water</li>
          <li className="list-disc">Baby formula</li>
        </ul>
      </div>
      <div className="grid gap-1.5">
        <p className="m-0 flex items-center gap-2 rotulo text-ink">
          <Swatch tone="warn" />
          Needed
        </p>
        <ul className="m-0 grid gap-1 ps-4.5 text-sm text-ink">
          <li className="list-disc">Blankets</li>
        </ul>
      </div>
    </div>
  ),
}
