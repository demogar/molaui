import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, Paperclip } from 'lucide-react'
import * as React from 'react'
import { fn } from 'storybook/test'

import { Button, IconButton } from '../../button'
import { HardState, HardStates as HardStatesFrame } from '../../../docs/blocks/hard-states'

import { AttachmentChip, PromptInput } from './prompt-input'

const meta = {
  title: 'AI/Prompt input',
  tags: ['stable'],
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
  <Button size="sm" variant="ghost">
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

export const HardStates: Story = {
  name: 'Hard states',
  tags: ['hard-states', '!autodocs'],
  render: () => (
    <HardStatesFrame>
      <HardState state="long-label">
        <PromptInput
          label="Message the Cayuco research agent about the Starter plan help panel rollout"
          onSubmit={fn()}
          defaultValue="Compare the ticket rate per 1,000 workspaces for every Starter signup cohort since the help panel went to 50%, and tell me whether the first-reply guardrail held in each one."
          attachments={<AttachmentChip name="ro-0412_assignments_by_plan_and_signup_cohort_final.csv" detail="CSV · 4.1 MB" onRemove={fn()} />}
        />
      </HardState>
      <HardState state="rtl">
        <PromptInput label="راسل كايوكو" placeholder="اسأل عن مقياس أو مستند" onSubmit={fn()} toolbar={<ModelPicker />} />
      </HardState>
      <HardState state="disabled">
        <PromptInput label="Message Cayuco" defaultValue="Summarise the fair-play policy." onSubmit={fn()} disabled />
      </HardState>
      <HardState state="error">
        <PromptInput label="Message Cayuco" status="offline" defaultValue="Draft kept while the connection is down…" onSubmit={fn()} />
      </HardState>
    </HardStatesFrame>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'A long draft grows to its row limit and then scrolls, and a long attachment name truncates inside its chip; in right to left the send button and the estimate change sides; disabled takes the disabled ground and a send that cannot be pressed; the error is offline, where the draft stays editable and the composer says in words why it cannot be sent.',
      },
    },
  },
}
