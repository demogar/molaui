import type { Meta, StoryObj } from '@storybook/react-vite'

import { OPERATOR_QUESTION } from './_data'
import { AgentConsoleScreen } from './agent-console'

const meta = {
  title: 'Patterns/Agent console',
  component: AgentConsoleScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: { inline: false, height: '900px' },
      description: {
        component: [
          'Every AI component, composed into a working console for **Cayuco**, a fictional internal knowledge-and-agent platform. Ask it something (or pick a suggestion): the agent plans, calls two tools, and streams a cited answer, while the run panel on the right shows the same work as a timeline with live clocks and token usage. Press **Stop** mid-answer to see cancellation; the transcript keeps what arrived.',
          '',
          '**Decisions.** The transcript is what was said and the run panel is what was done, so the answer is not repeated in the panel. A failed tool call is said once, in the turn, with the error verbatim and Retry; the panel states the failed step without a second alert. Someone who may not ask the agent gets no composer to be refused by: a callout names who can give access.',
          '',
          'The screen owns its scripted run rather than importing the story harness from the AI stories, because a pattern may lean only on what the package exports, and exporting a demo harness would ship fixtures to every consumer. The demo content — an in-app help panel rollout — is invented, and there is no model behind this page.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof AgentConsoleScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Console: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Nothing asked yet: the console says what it can answer and offers two questions, and the run panel says what will appear there.',
      },
    },
  },
}

export const Working: Story = {
  args: { defaultQuestion: OPERATOR_QUESTION, holdAt: 7_000 },
  parameters: {
    docs: {
      description: {
        story:
          'Held seven seconds into a run: the plan and both tool calls are done, the answer is streaming with its citations, the run panel’s answer step is live, and the composer offers Stop.',
      },
    },
  },
}

export const ToolFails: Story = {
  name: 'Tool fails',
  args: { defaultQuestion: OPERATOR_QUESTION, failFirstRun: true },
  parameters: {
    docs: {
      description: {
        story:
          'The rollout query times out. The turn says so once, with the warehouse’s error verbatim and **Retry**; the run panel marks the step failed and offers Retry run. Retrying asks again, and this time the query answers.',
      },
    },
  },
}

export const NoPermission: Story = {
  name: 'No permission',
  args: { canAsk: false },
  parameters: {
    docs: {
      description: {
        story:
          'Someone who can read the workspace but not use its agent. No composer to type into and be refused by, and no suggestions to press: a callout names who can grant access.',
      },
    },
  },
}
