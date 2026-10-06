import type { Meta, StoryObj } from '@storybook/react-vite'

import { Code, CodeBlock } from './code'

const ARGS = `{
  "tool": "warehouse.query",
  "arguments": {
    "sql": "SELECT plan, COUNT(*) AS tickets, AVG(first_reply_s) AS frt FROM tickets WHERE rollout_id = 'ro_help_panel' GROUP BY plan",
    "timeout_ms": 30000,
    "dry_run": false,
    "cache": null
  }
}`

const SQL = `SELECT plan,
       COUNT(*)            AS tickets,
       AVG(first_reply_s)  AS frt
FROM   tickets
WHERE  rollout_id = 'ro_help_panel'
GROUP  BY plan
ORDER  BY plan;`

const meta = {
  title: 'Components/Data display/Code',
  component: CodeBlock,
  args: { code: ARGS, language: 'json', label: 'arguments' },
  argTypes: {
    language: { control: 'select', options: ['json', 'text', 'shell', 'sql', 'ts', 'python', 'markdown'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Machine text — the one place the system admits a monospace (Martian Mono, narrowed on its width axis). A cut panel on raised cloth, **not a black terminal box**: code is just another kind of content on the same cloth, and in the dark theme it is dark because everything is. JSON is tokenized by value kind — strings verde, numbers añil, `true/false/null` rojo — because what an operator scans a payload for is a value; keys stay ink. Truncated JSON from a stream renders exactly as it arrived.',
      },
    },
  },
} satisfies Meta<typeof CodeBlock>

export default meta
type Story = StoryObj<typeof meta>

export const ToolArguments: Story = {}

export const Wrapped: Story = { args: { wrap: true } }

export const QueryWithLineNumbers: Story = {
  args: { code: SQL, language: 'sql', label: 'query.sql', lineNumbers: true },
}

export const ScrollsInside: Story = {
  args: {
    code: Array.from({ length: 40 }, (_, i) => `[${String(i).padStart(2, '0')}:14.${i}] step ${i} completed in ${(i * 37) % 900} ms`).join('\n'),
    language: 'text',
    label: 'run.log',
    maxHeight: '220px',
    lineNumbers: true,
  },
}

export const StreamingTruncated: Story = {
  args: { code: '{\n  "query": "workspaces that opened more than 20 tick', label: 'arguments · streaming' },
  parameters: {
    docs: { description: { story: 'Mid-stream, the payload is not valid JSON yet. The tokenizer fails safe and shows exactly what has arrived.' } },
  },
}

export const Inline: Story = {
  render: () => (
    <p className="m-0 max-w-xl text-base text-ink-2">
      The run <Code>run_8f2c41</Code> called <Code>warehouse.query</Code> with <Code>dry_run: false</Code>.
    </p>
  ),
}
