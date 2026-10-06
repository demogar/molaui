import type { Meta, StoryObj } from '@storybook/react-vite'

import { Prose } from './prose'

const meta = {
  title: 'Components/Typography/Prose',
  component: Prose,
  args: { size: 'base' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'base'] } },
  parameters: {
    docs: {
      description: {
        component:
          'The reading voice for long-form markup — an article, a run summary, **a model’s answer**. An assistant reply is read, not scanned; set in the UI grotesque it looks like a settings panel and gets skimmed like one. The text face tells the reader to slow down, and the boundary between what the model *said* and what the system *did* is drawn by the typeface itself. Reading size does not shrink with density: a compact table is dense in its rows, not in the paragraphs someone has to read.',
      },
    },
  },
  render: (args) => (
    <Prose {...args}>
      <p>
        Short answer: the <strong>saved-replies rollout</strong> sped up first replies for Starter workspaces, but not
        for anyone already on the Enterprise plan.
      </p>
      <h2>What the data says</h2>
      <p>
        Across 41,382 eligible tickets, same-day resolution rose from 38.1% to 41.6%. The effect sits almost entirely in
        the Starter plan. I queried <code>events.ticket_reply</code> and joined on <code>rollout_exposure</code>;
        the exact query is in the tool call above.
      </p>
      <ol>
        <li>Starter agents found a matching saved reply and sent more of them.</li>
        <li>Enterprise agents saw no change, as expected — their replies are already templated.</li>
        <li>No guardrail metric moved outside its interval.</li>
      </ol>
      <blockquote>Treat the Enterprise result as a null, not as a negative effect. The interval spans zero.</blockquote>
      <h3>Caveats</h3>
      <ul>
        <li>
          The exposure log has a 40-minute gap on day 3. See <a href="#incident">the incident note</a>.
        </li>
        <li>Mobile and web are pooled.</li>
      </ul>
    </Prose>
  ),
} satisfies Meta<typeof Prose>

export default meta
type Story = StoryObj<typeof meta>

export const Document: Story = {}

export const ChatColumn: Story = { args: { size: 'sm' } }
