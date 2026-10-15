import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coins, FileText, ListTree, ScrollText } from 'lucide-react'

import { useScrollEdge } from '../../lib/scroll-edge'
import { Tabs, TabsList, TabsPanel, TabsTab } from './tabs'
import { HardState, HardStates as HardStatesFrame } from '../../docs/blocks/hard-states'
import { DirectionProvider } from '../../lib/direction'

/** Source that scrolls sideways on a phone, with the scroll-edge cue. */
function Snippet({ children }: { children: string }) {
  return (
    <pre ref={useScrollEdge()} className="literal m-0 overflow-x-auto text-ink-2 scroll-cloth scroll-edge">
      {children}
    </pre>
  )
}

const meta = {
  title: 'Components/Navigation/Tabs',
  tags: ['stable'],
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

const body = 'max-w-reading text-sm text-ink-2'

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
        <TabsTab value="replay" disabled aria-describedby="tabs-replay-reason">
          Replay
        </TabsTab>
      </TabsList>
      <p id="tabs-replay-reason" className="mt-2 mb-0 text-xs text-ink-muted">
        Replay is available once the run finishes.
      </p>
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
        <Snippet>{`const run = await agents.runs.create({\n  agent: 'knowledge-agent',\n  input: 'Summarise the fair-play policy',\n})`}</Snippet>
      </TabsPanel>
      <TabsPanel value="py">
        <Snippet>{`run = agents.runs.create(\n    agent="knowledge-agent",\n    input="Summarise the fair-play policy",\n)`}</Snippet>
      </TabsPanel>
      <TabsPanel value="curl">
        <Snippet>{`curl -X POST /v1/runs \\\n  -d agent=knowledge-agent`}</Snippet>
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

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <Tabs defaultValue="escalations">
          <TabsList>
            <TabsTab value="escalations" count={1203}>
              Escalated to a person
            </TabsTab>
            <TabsTab value="retries">Retried after a tool failure</TabsTab>
            <TabsTab value="tokens">Token usage by step</TabsTab>
          </TabsList>
          <TabsPanel value="escalations">
            <p className={body}>1,203 runs handed to a person this week.</p>
          </TabsPanel>
        </Tabs>
      </HardState>
      <HardState state="rtl">
        <DirectionProvider direction="rtl">
          <Tabs defaultValue="trace">
            <TabsList>
              <TabsTab value="trace" icon={<ListTree />} count={14}>
                التتبّع
              </TabsTab>
              <TabsTab value="output" icon={<FileText />}>
                المخرجات
              </TabsTab>
              <TabsTab value="cost" icon={<Coins />}>
                التكلفة
              </TabsTab>
            </TabsList>
            <TabsPanel value="trace">
              <p className={body}>١٤ خطوة و٦ استدعاءات أدوات.</p>
            </TabsPanel>
          </Tabs>
          <Tabs variant="panel" defaultValue="ts">
            <TabsList>
              <TabsTab value="ts">TypeScript</TabsTab>
              <TabsTab value="py">Python</TabsTab>
            </TabsList>
            <TabsPanel value="ts">
              <p className={body}>مثال على إنشاء تشغيل.</p>
            </TabsPanel>
          </Tabs>
        </DirectionProvider>
      </HardState>
      <HardState state="disabled">
        <Tabs defaultValue="trace">
          <TabsList>
            <TabsTab value="trace">Trace</TabsTab>
            <TabsTab value="output">Output</TabsTab>
            <TabsTab value="replay" disabled aria-describedby="tabs-hard-replay-reason">
              Replay
            </TabsTab>
          </TabsList>
          <p id="tabs-hard-replay-reason" className="mt-2 mb-0 text-xs text-ink-muted">
            Replay is available once the run finishes.
          </p>
          <TabsPanel value="trace">
            <p className={body}>Still running: step 9 of about 14.</p>
          </TabsPanel>
        </Tabs>
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Long labels keep one row and scroll inside the list, as the Overflowing story says, rather than wrapping into two rows of tabs; in right to left the order, the icons, the counts and the indicator mirror, in both variants; a disabled tab takes the disabled ground and says why beside the list. Tabs have no error state: a view that fails to load shows its failure in its panel.',
      },
    },
  },
}
