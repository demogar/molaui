import type { Meta, StoryObj } from '@storybook/react-vite'
import * as React from 'react'

import { Field } from '../field/field'
import { FileUpload, type FileUploadItem, type UploadContext } from './file-upload'

const meta = {
  title: 'Components/Forms/File upload',
  component: FileUpload,
  parameters: {
    docs: {
      description: {
        component:
          'A dropzone with a real button in it, and a list of what was put there. **The keyboard path is the button**: dragging has no keyboard equivalent, so the zone is not a fake button — Enter or Space on Browse opens the native picker, and pressing anywhere else in the zone does too, for the pointer. **The picker’s filter is advice**: drag and drop never applies it and every platform lets the person pick "All files", so every file is checked again and each rejection is a sentence that names the file and the rule. **Dragging is said, not only shown**: the gold band is revealed, the glyph changes and the headline becomes "Drop to add 3 files", and the same sentence goes to a polite live region. Each row states its status as glyph, word and colour, with a progress bar while it moves. Sizes are SI (1 MB = 1,000,000 bytes) because Intl’s `megabyte` is, and the limit the person reads has to be the limit the check applies.',
      },
    },
  },
} satisfies Meta<typeof FileUpload>

export default meta
type Story = StoryObj<typeof meta>

const MB = 1_000_000

/** A file whose reported size is set without allocating it, for fixed demo states. */
function demoFile(name: string, size: number, type = '') {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/**
 * A stand-in for an upload endpoint: progress in steps, honouring the abort
 * signal. Any file with "partial" in its name fails part-way, so the failure
 * and retry path can be tried by hand.
 */
function simulateUpload(file: File, { signal, onProgress }: UploadContext) {
  return new Promise<void>((resolve, reject) => {
    let done = 0
    const timer = setInterval(() => {
      done += 0.08
      if (file.name.includes('partial') && done > 0.6) {
        clearInterval(timer)
        reject(new Error('The server closed the connection at 61%. Retry to send it again.'))
        return
      }
      onProgress(Math.min(done, 1))
      if (done >= 1) {
        clearInterval(timer)
        resolve()
      }
    }, 180)
    signal.addEventListener('abort', () => clearInterval(timer))
  })
}

export const EvaluationDataset: Story = {
  name: 'Evaluation dataset (in Field)',
  render: () => (
    <div className="max-w-xl">
      <Field
        label="Evaluation dataset"
        required
        hint="One prompt per row, with an expected answer. Cayuco runs every row against the agent and scores it."
      >
        {(control) => (
          <FileUpload {...control} accept=".jsonl,.csv" maxSize={25 * MB} onUpload={simulateUpload} />
        )}
      </Field>
    </div>
  ),
}

const KNOWLEDGE_FILES: FileUploadItem[] = [
  {
    id: 'kb-1',
    name: 'Opening repertoire — club handbook.pdf',
    size: 4.8 * MB,
    file: demoFile('Opening repertoire — club handbook.pdf', 4.8 * MB, 'application/pdf'),
    status: 'done',
  },
  {
    id: 'kb-2',
    name: 'tournament-rules-2026.md',
    size: 38_400,
    file: demoFile('tournament-rules-2026.md', 38_400),
    status: 'uploading',
    progress: 0.64,
  },
  {
    id: 'kb-3',
    name: 'Coach onboarding notes.pdf',
    size: 2.1 * MB,
    file: demoFile('Coach onboarding notes.pdf', 2.1 * MB, 'application/pdf'),
    status: 'queued',
  },
  {
    id: 'kb-4',
    name: 'support-faq-partial.md',
    size: 112_000,
    file: demoFile('support-faq-partial.md', 112_000),
    status: 'failed',
    error: 'The server closed the connection at 61%. Retry to send it again.',
  },
]

export const KnowledgeBaseStates: Story = {
  name: 'Knowledge base, every row state',
  parameters: {
    docs: {
      description: {
        story:
          'Uploaded, uploading, queued and failed, side by side. `maxConcurrent={1}` holds the queued row behind the one already moving. The failed row keeps the server’s reason under it and offers Retry; Remove aborts an upload in flight and moves focus to the next row rather than dropping it on the page.',
      },
    },
  },
  render: () => (
    <div className="max-w-xl">
      <Field label="Knowledge base documents" hint="The agent answers only from these. PDF or Markdown.">
        {(control) => (
          <FileUpload
            {...control}
            multiple
            accept=".pdf,.md"
            maxSize={50 * MB}
            maxFiles={20}
            maxConcurrent={1}
            defaultFiles={KNOWLEDGE_FILES}
            onUpload={simulateUpload}
          />
        )}
      </Field>
    </div>
  ),
}

/**
 * Story-only: replays a real drag (or drop) on the zone, so a state that
 * normally exists only under a moving pointer can be seen and screenshotted.
 * Browsers only — jsdom has no DataTransfer, so in the test run the story
 * renders its resting state.
 */
function useReplayDrag(type: 'dragenter' | 'drop', files: () => File[]) {
  const ref = React.useRef<HTMLDivElement>(null)
  const filesRef = React.useRef(files)
  React.useEffect(() => {
    const zone = ref.current?.querySelector('[data-slot="file-upload-dropzone"]')
    if (!zone || typeof DataTransfer === 'undefined' || typeof DragEvent === 'undefined') return
    const transfer = new DataTransfer()
    for (const file of filesRef.current()) transfer.items.add(file)
    zone.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
  }, [type])
  return ref
}

function DraggingDemo() {
  const ref = useReplayDrag('dragenter', () => [
    demoFile('prompts-week-40.jsonl', 3.2 * MB),
    demoFile('prompts-week-41.jsonl', 2.9 * MB),
    demoFile('prompts-week-42.jsonl', 3.4 * MB),
  ])
  return (
    <div ref={ref} className="max-w-xl">
      <Field label="Evaluation datasets">
        {(control) => <FileUpload {...control} multiple accept=".jsonl,.csv" maxSize={25 * MB} />}
      </Field>
    </div>
  )
}

export const Dragging: Story = {
  name: 'Dragging over',
  parameters: {
    docs: {
      description: {
        story:
          'Three files held over the zone. The band beneath the cut is revealed wider than a hover, the glyph turns into a drop arrow, and the headline is replaced by what will happen — "Drop to add 3 files" — which is also announced. Colour is the weakest of the three signals; forced colours removes it and the words remain.',
      },
    },
  },
  render: () => <DraggingDemo />,
}

function RejectionsDemo() {
  const ref = useReplayDrag('drop', () => [
    demoFile('agent-runs-sept.csv', 6.4 * MB),
    demoFile('budget-q4.xlsx', 220_000),
    demoFile('full-crawl-2026-09.jsonl', 41.7 * MB),
  ])
  return (
    <div ref={ref} className="max-w-xl">
      <Field label="Evaluation datasets" hint="Up to 3 files; each is scored as its own run.">
        {(control) => (
          <FileUpload {...control} multiple accept=".jsonl,.csv" maxSize={25 * MB} maxFiles={3} />
        )}
      </Field>
    </div>
  )
}

export const ValidationErrors: Story = {
  name: 'Rejected files',
  parameters: {
    docs: {
      description: {
        story:
          'A drop of three files where two break a rule. Each rejection names the file and the rule it broke, with the size or types spelled out — never "Invalid file". Rejected files are not added to the list, because a row for a file that will not be sent reads as one that will.',
      },
    },
  },
  render: () => <RejectionsDemo />,
}

export const Invalid: Story = {
  name: 'Invalid (from Field)',
  render: () => (
    <div className="max-w-xl">
      <Field label="Evaluation dataset" required error="Attach a dataset before starting the evaluation run.">
        {(control) => <FileUpload {...control} accept=".jsonl,.csv" maxSize={25 * MB} />}
      </Field>
    </div>
  ),
}

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Stated, not faded: the zone takes the shade field and muted ink, keeps its keyline, and its button is a disabled button. Rows already attached stay readable; their actions are disabled with the rest.',
      },
    },
  },
  render: () => (
    <div className="max-w-xl">
      <Field label="Knowledge base documents" hint="Uploads are paused while the index rebuilds.">
        {(control) => (
          <FileUpload
            {...control}
            multiple
            disabled
            accept=".pdf,.md"
            maxSize={50 * MB}
            defaultFiles={[KNOWLEDGE_FILES[0]!]}
          />
        )}
      </Field>
    </div>
  ),
}
