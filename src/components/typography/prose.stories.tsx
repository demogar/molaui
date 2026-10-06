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
        Short answer: the <strong>rating-band experiment</strong> moved puzzle retention for new players, but not
        for anyone who already had a rating above 1200.
      </p>
      <h2>What the data says</h2>
      <p>
        Across 41,382 eligible accounts, day-7 return rose from 38.1% to 41.6%. The effect sits almost entirely in
        the first band. I queried <code>events.puzzle_session</code> and joined on <code>experiment_exposure</code>;
        the exact query is in the tool call above.
      </p>
      <ol>
        <li>New players saw easier first puzzles and solved more of them.</li>
        <li>Experienced players saw no change, as expected — their first puzzle is already calibrated.</li>
        <li>No guardrail metric moved outside its interval.</li>
      </ol>
      <blockquote>Treat the 1200+ result as a null, not as a negative effect. The interval spans zero.</blockquote>
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
