import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge, RecommendationBadge, StatusDot, type BadgeTone } from './badge'

const TONES: BadgeTone[] = ['neutral', 'info', 'success', 'warn', 'danger', 'accent']
const LABEL: Record<BadgeTone, string> = {
  neutral: 'Queued',
  info: 'Running',
  success: 'Succeeded',
  warn: 'Degraded',
  danger: 'Failed',
  accent: 'Pinned',
}

const meta = {
  title: 'Components/Feedback/Badge',
  component: Badge,
  args: { children: 'Succeeded', tone: 'success', variant: 'soft', dot: true },
  argTypes: {
    tone: { control: 'select', options: TONES },
    variant: { control: 'inline-radio', options: ['solid', 'soft', 'outline'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A status mark cut from one of the four layers: añil is info, verde success, rojo danger, gold warn and accent. There is no fifth hue for "running" — a colour the system does not own is a colour the reader has to learn. **Soft is the default**, because a column of fifty solid statuses is a quilt, not a column. Every pairing is measured at ≥ 4.5:1 in both themes; the ratios are in the source.',
      },
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Matrix: Story = {
  render: () => (
    <div className="max-w-full overflow-x-auto">
      <table className="border-separate border-spacing-x-4 border-spacing-y-3">
        <thead>
          <tr>
            <th className="rotulo text-start text-ink-muted">Tone</th>
            <th className="rotulo text-start text-ink-muted">Solid</th>
            <th className="rotulo text-start text-ink-muted">Soft</th>
            <th className="rotulo text-start text-ink-muted">Outline</th>
          </tr>
        </thead>
        <tbody>
          {TONES.map((tone) => (
            <tr key={tone}>
              <td className="pe-4 font-ui text-sm text-ink-2">{tone}</td>
              {(['solid', 'soft', 'outline'] as const).map((variant) => (
                <td key={variant}>
                  <Badge tone={tone} variant={variant} dot>
                    {LABEL[tone]}
                  </Badge>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Two pairings were rejected by measurement: warn text on the gold wash is 4.47:1 in light, so a soft warning is set in ink with the gold carried by the dot. Gold is never text on light cloth — the accent outline puts the gold in the edge.',
      },
    },
  },
}

export const Live: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge tone="info" dot pulse>
        Streaming
      </Badge>
      <Badge tone="info" variant="solid" dot pulse>
        Live
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A pulsing dot means *this is happening now*. Under reduced motion the pulse stills and the dot stays — the state is still true.',
      },
    },
  },
}

export const StatusDots: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {TONES.map((tone) => (
        <li key={tone} className="flex items-center gap-2 text-sm text-ink-2">
          <StatusDot tone={tone} />
          {LABEL[tone]}
        </li>
      ))}
    </ul>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Square, never round: a blade cannot cut a circle. A dot is never the only carrier of a state — a label sits beside it, or the dot names itself with `label`.',
      },
    },
  },
}

export const Recommendation: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <RecommendationBadge level="essential" />
      <RecommendationBadge level="highly" />
      <RecommendationBadge level="detour" />
      <RecommendationBadge level="time" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Lineage: the editorial scale from Must Do Panama, where this system was born. Gold is the layer a mola reveals last and least, so gold is *essential*.',
      },
    },
  },
}
