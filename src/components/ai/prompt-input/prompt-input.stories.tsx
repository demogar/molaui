import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, Paperclip } from 'lucide-react'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button, IconButton } from '../../button'

import { AttachmentChip, PromptInput } from './prompt-input'

const meta = {
  title: 'AI/Prompt input',
  component: PromptInput,
  args: { label: 'Message Cayuco', onSubmit: fn(), onStop: fn(), placeholder: 'Ask about a rollout, a metric, a doc…' },
  argTypes: {
    status: { control: 'inline-radio', options: ['idle', 'generating', 'offline'] },
    submitOn: { control: 'inline-radio', options: ['enter', 'mod-enter'] },
  },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
  parameters: {
    docs: {
      description: {
        component: [
          'The composer. The whole composer takes the focus ring — field, attachments and send button are one object to the person using it.',
          '',
          '- **Send becomes Stop**, in the same place at the same size. Stop is the most time-critical control in an AI interface: the model is going the wrong way and every second costs tokens.',
          '- **The draft is sacred.** Offline does not disable the field; the operator keeps typing and is told plainly why it cannot be sent.',
          '- **The estimate is labelled as one**: `~120 tok`, from characters ÷ 4. It is there so you notice you pasted a log file, not to bill anyone.',
          '- `submitOn="mod-enter"` for long-form prompts, where an accidental send costs a model run.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof PromptInput>

export default meta
type Story = StoryObj<typeof meta>

const ModelPicker = () => (
  <Button size="sm" variant="ghost" className="normal-case tracking-normal">
    <span className="literal text-xs">cayuco-deep-3</span>
    <ChevronDown />
  </Button>
)

export const Default: Story = {
  args: { toolbar: <ModelPicker /> },
}

function WithFiles(args: React.ComponentProps<typeof PromptInput>) {
    const [files, setFiles] = React.useState(['ro-0412_assignments.csv', 'help-panel-v2-brief.md'])
    return (
      <PromptInput
        {...args}
        defaultValue="Compare these two and tell me whether the guardrail held."
        attachments={files.map((f) => (
          <AttachmentChip key={f} name={f} detail={f.endsWith('.csv') ? 'CSV · 4.1 MB' : 'MD · 9 KB'} onRemove={() => setFiles((all) => all.filter((x) => x !== f))} />
        ))}
        toolbar={
          <>
            <IconButton label="Attach a file" size="sm" variant="ghost">
              <Paperclip />
            </IconButton>
            <ModelPicker />
          </>
        }
      />
    )
}

export const WithAttachments: Story = {
  render: (args) => <WithFiles {...args} />,
}

export const Generating: Story = {
  args: { status: 'generating', defaultValue: 'And for Enterprise workspaces?', toolbar: <ModelPicker /> },
}

export const Offline: Story = {
  args: { status: 'offline', defaultValue: 'Draft kept while the connection is down…' },
}

export const LongFormSubmit: Story = {
  args: { submitOn: 'mod-enter', placeholder: 'Write a brief for the research agent…' },
}
