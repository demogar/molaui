import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coins, FileText, ListTree, ScrollText } from 'lucide-react'

import { Tabs, TabsList, TabsPanel, TabsTab } from './tabs'

const meta = {
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          '**Underline** switches views of one thing: a 3px ink bar slides to the selected tab — one element moving, not one per tab appearing. **Panel** is for tabs that are containers: the selected tab is a cut tab joined to the panel, its bottom overlapping the panel’s keyline by exactly the keyline width so they read as one shape, with a gold band revealed along its top. Labels are sentence case in the UI voice; a row of capitalised, expanded labels reads as buttons.',
      },
    },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

const body = 'max-w-prose text-sm text-ink-2'

export const Underline: Story = {
  render: () => (
    <Tabs defaultValue="trace">
      <TabsList>
        <TabsTab value="trace" icon={<ListTree />} count={14}>
          Trace
        </TabsTab>
        <TabsTab value="output" icon={<FileText />}>
          Output
        </TabsTab>
        <TabsTab value="cost" icon={<Coins />}>
          Cost
        </TabsTab>
        <TabsTab value="logs" icon={<ScrollText />} count={1203}>
          Logs
        </TabsTab>
        <TabsTab value="replay" disabled>
          Replay
        </TabsTab>
      </TabsList>
      <TabsPanel value="trace">
        <p className={body}>14 steps, 6 tool calls, 2 retries.</p>
      </TabsPanel>
      <TabsPanel value="output">
        <p className={body}>The agent’s final answer.</p>
      </TabsPanel>
      <TabsPanel value="cost">
        <p className={body}>41,208 input tokens · 2,914 output tokens.</p>
      </TabsPanel>
      <TabsPanel value="logs">
        <p className={body}>Raw logs, newest first.</p>
      </TabsPanel>
    </Tabs>
  ),
}

export const Panel: Story = {
  render: () => (
    <Tabs variant="panel" defaultValue="ts" className="max-w-xl">
      <TabsList>
        <TabsTab value="ts">TypeScript</TabsTab>
        <TabsTab value="py">Python</TabsTab>
        <TabsTab value="curl">cURL</TabsTab>
      </TabsList>
      <TabsPanel value="ts">
        <pre className="literal m-0 text-ink-2">{`const run = await agents.runs.create({\n  agent: 'knowledge-agent',\n  input: 'Summarise the fair-play policy',\n})`}</pre>
      </TabsPanel>
      <TabsPanel value="py">
        <pre className="literal m-0 text-ink-2">{`run = agents.runs.create(\n    agent="knowledge-agent",\n    input="Summarise the fair-play policy",\n)`}</pre>
      </TabsPanel>
      <TabsPanel value="curl">
        <pre className="literal m-0 text-ink-2">{`curl -X POST /v1/runs \\\n  -d agent=knowledge-agent`}</pre>
      </TabsPanel>
    </Tabs>
  ),
}

export const Overflowing: Story = {
  render: () => (
    <div className="max-w-sm">
      <Tabs defaultValue="t0">
        <TabsList>
          {['Overview', 'Variants', 'Audience', 'Metrics', 'Guardrails', 'Rollout', 'History'].map((label, i) => (
            <TabsTab key={label} value={`t${i}`}>
              {label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  ),
  parameters: {
    docs: { description: { story: 'The list scrolls inside itself rather than wrapping into two rows of tabs; the focus ring is drawn inside each tab so the scroll clip never shaves it.' } },
  },
}
