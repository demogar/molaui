import { DirectionProvider } from '@base-ui/react/direction-provider'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Field } from '../field/field'
import { FileUpload, type UploadContext } from './file-upload'
import { describeAccept, formatFileSize, matchesAccept, validateFiles } from './file-upload-utils'

/** A file of a given size without allocating it: jsdom reads `size` from the parts. */
function file(name: string, size = 10, type = '') {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

function dataTransfer(files: File[]) {
  return {
    files,
    items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
    types: ['Files'],
    dropEffect: 'none',
  }
}

const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!
const dropzone = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="file-upload-dropzone"]')!
const user = () => userEvent.setup({ applyAccept: false })

afterEach(() => vi.restoreAllMocks())

describe('file upload rules', () => {
  it('formats sizes in SI steps in the given locale', () => {
    expect(formatFileSize(14_200_000, 'en-US')).toBe('14.2 MB')
    expect(formatFileSize(14_200_000, 'de-DE')).toBe('14,2 MB')
    expect(formatFileSize(512, 'en-US')).toBe('512 byte')
  })

  it('matches accept by extension, wildcard and exact type', () => {
    expect(matchesAccept({ name: 'eval.JSONL', type: '' }, '.jsonl,.csv')).toBe(true)
    expect(matchesAccept({ name: 'a.png', type: 'image/png' }, 'image/*')).toBe(true)
    expect(matchesAccept({ name: 'a.pdf', type: 'application/pdf' }, 'application/pdf')).toBe(true)
    expect(matchesAccept({ name: 'budget.xlsx', type: '' }, '.jsonl,.csv')).toBe(false)
    expect(describeAccept('.jsonl, .csv', 'en-US')).toBe('.jsonl or .csv')
  })

  it('checks type before size and keeps the first files under maxFiles', () => {
    const { accepted, rejected } = validateFiles([file('big.xlsx', 9e9), file('a.csv'), file('b.csv')], {
      accept: '.csv',
      maxSize: 1000,
      maxFiles: 2,
      existing: 1,
    })
    expect(accepted.map((f) => f.name)).toEqual(['a.csv'])
    expect(rejected.map((r) => [r.file.name, r.reason])).toEqual([
      ['big.xlsx', 'type'],
      ['b.csv', 'count'],
    ])
  })
})

describe('FileUpload', () => {
  it('is a button named by Field, described by the rules and the hint', () => {
    render(
      <Field label="Evaluation dataset" hint="One prompt per row." required>
        {(control) => <FileUpload {...control} accept=".jsonl,.csv" maxSize={25_000_000} locale="en-US" />}
      </Field>,
    )
    const button = screen.getByRole('button', { name: 'Evaluation dataset' })
    expect(button).toHaveAccessibleDescription('.jsonl or .csv · up to 25 MB One prompt per row.')
  })

  it('is named by its own label outside Field', () => {
    render(<FileUpload multiple />)
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeInTheDocument()
  })

  it('opens the native picker from the keyboard', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    render(<FileUpload />)
    const u = user()
    await u.tab()
    expect(screen.getByRole('button', { name: 'Browse' })).toHaveFocus()
    await u.keyboard('{Enter}')
    await u.keyboard(' ')
    expect(click).toHaveBeenCalledTimes(2)
  })

  it('lists picked files with size and status, and announces the batch', async () => {
    const onFilesChange = vi.fn()
    const { container } = render(<FileUpload multiple locale="en-US" onFilesChange={onFilesChange} />)
    await user().upload(fileInput(container), [file('runs.csv', 2_400_000), file('notes.md', 800)])
    const list = screen.getByRole('list', { name: 'Files' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('runs.csv2.4 MB·Attached')
    expect(rows[1]).toHaveTextContent('notes.md800 byte·Attached')
    expect(screen.getByRole('status')).toHaveTextContent('Added 2 files.')
    expect(onFilesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: 'runs.csv', status: 'attached' }),
      expect.objectContaining({ name: 'notes.md', status: 'attached' }),
    ])
  })

  it('states each rejection in words, naming the file and the rule', async () => {
    const onReject = vi.fn()
    const { container } = render(
      <FileUpload multiple accept=".jsonl,.csv" maxSize={10_000_000} maxFiles={2} locale="en-US" onReject={onReject} />,
    )
    await user().upload(fileInput(container), [
      file('budget.xlsx', 100),
      file('crawl.jsonl', 14_200_000),
      file('a.csv'),
      file('b.csv'),
      file('c.csv'),
    ])
    expect(screen.getByText('budget.xlsx is not an accepted type. Use .jsonl or .csv.')).toBeInTheDocument()
    expect(screen.getByText('crawl.jsonl is 14.2 MB; the limit is 10 MB.')).toBeInTheDocument()
    expect(screen.getByText('c.csv was not added: the limit is 2 files.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Files' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('Added 2 files. 3 files were not added.')
    expect(onReject).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ reason: 'size' })]))
  })

  it('says and shows the drag state, then takes the drop', () => {
    const { container } = render(<FileUpload multiple />)
    const zone = dropzone(container)
    const files = [file('a.csv'), file('b.csv'), file('c.csv')]
    fireEvent.dragEnter(zone, { dataTransfer: dataTransfer(files) })
    expect(zone).toHaveAttribute('data-dragging')
    expect(screen.getByText('Drop to add 3 files', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Drop to add 3 files')

    // A dragleave from a child after a dragenter on it keeps the state.
    fireEvent.dragEnter(zone, { dataTransfer: dataTransfer(files) })
    fireEvent.dragLeave(zone)
    expect(zone).toHaveAttribute('data-dragging')

    fireEvent.drop(zone, { dataTransfer: dataTransfer(files) })
    expect(zone).not.toHaveAttribute('data-dragging')
    expect(within(screen.getByRole('list', { name: 'Files' })).getAllByRole('listitem')).toHaveLength(3)
  })

  it('ignores drags and drops while disabled, and states it with a disabled button', () => {
    const { container } = render(<FileUpload disabled />)
    const zone = dropzone(container)
    expect(screen.getByRole('button', { name: 'Browse' })).toBeDisabled()
    fireEvent.dragEnter(zone, { dataTransfer: dataTransfer([file('a.csv')]) })
    expect(zone).not.toHaveAttribute('data-dragging')
    fireEvent.drop(zone, { dataTransfer: dataTransfer([file('a.csv')]) })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('keeps only one file without multiple, replacing the last', async () => {
    const { container } = render(<FileUpload />)
    await user().upload(fileInput(container), file('first.csv'))
    await user().upload(fileInput(container), file('second.csv'))
    const rows = within(screen.getByRole('list', { name: 'Files' })).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('second.csv')
  })

  it('drives onUpload with progress, then marks the file uploaded', async () => {
    let context: UploadContext | undefined
    let finish: () => void = () => {}
    const onUpload = vi.fn((_file: File, ctx: UploadContext) => {
      context = ctx
      return new Promise<void>((resolve) => {
        finish = resolve
      })
    })
    const { container } = render(<FileUpload onUpload={onUpload} locale="en-US" />)
    await user().upload(fileInput(container), file('crawl.jsonl', 5_000_000))
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('progressbar', { name: 'Uploading crawl.jsonl' })).not.toHaveAttribute('aria-valuenow')

    act(() => context!.onProgress(0.42))
    expect(screen.getByRole('progressbar', { name: 'Uploading crawl.jsonl' })).toHaveAttribute('aria-valuenow', '42')
    expect(screen.getByRole('listitem')).toHaveTextContent('Uploading 42%')

    await act(async () => finish())
    expect(screen.getByRole('listitem')).toHaveTextContent('Uploaded')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('crawl.jsonl uploaded.')
  })

  it('queues past maxConcurrent', async () => {
    const onUpload = vi.fn(() => new Promise<void>(() => {}))
    const { container } = render(<FileUpload multiple maxConcurrent={1} onUpload={onUpload} />)
    await user().upload(fileInput(container), [file('a.csv'), file('b.csv')])
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1))
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Uploading')
    expect(rows[1]).toHaveTextContent('Queued')
  })

  it('shows why an upload failed and retries it', async () => {
    const onUpload = vi
      .fn<(file: File, ctx: UploadContext) => Promise<void>>()
      .mockRejectedValueOnce(new Error('The connection closed at 61%.'))
      .mockResolvedValueOnce(undefined)
    const { container } = render(<FileUpload onUpload={onUpload} />)
    const u = user()
    await u.upload(fileInput(container), file('tickets.csv'))
    expect(await screen.findByText('The connection closed at 61%.')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('Failed')
    expect(screen.getByRole('status')).toHaveTextContent('tickets.csv failed to upload.')

    await u.click(screen.getByRole('button', { name: 'Retry tickets.csv' }))
    await waitFor(() => expect(screen.getByRole('listitem')).toHaveTextContent('Uploaded'))
    expect(onUpload).toHaveBeenCalledTimes(2)
  })

  it('aborts on remove, announces it, and moves focus to a neighbour', async () => {
    const signals: AbortSignal[] = []
    const onUpload = vi.fn((_file: File, { signal }: UploadContext) => {
      signals.push(signal)
      return new Promise<void>(() => {})
    })
    const { container } = render(<FileUpload multiple onUpload={onUpload} />)
    const u = user()
    await u.upload(fileInput(container), [file('a.csv'), file('b.csv')])
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2))

    await u.click(screen.getByRole('button', { name: 'Remove a.csv' }))
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
    expect(screen.getByRole('status')).toHaveTextContent('Removed a.csv.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove b.csv' })).toHaveFocus())

    await u.keyboard('{Enter}')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Browse files' })).toHaveFocus())
  })

  it('marks the zone invalid from Field', () => {
    const { container } = render(
      <Field label="Dataset" error="Attach the dataset before starting the run.">
        {(control) => <FileUpload {...control} />}
      </Field>,
    )
    expect(dropzone(container)).toHaveAttribute('data-invalid')
    expect(screen.getByRole('button', { name: 'Dataset' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('works the same right to left', async () => {
    const { container } = render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <FileUpload multiple locale="ar-EG" />
        </div>
      </DirectionProvider>,
    )
    fireEvent.drop(dropzone(container), { dataTransfer: dataTransfer([file('تقرير.csv', 2_400_000)]) })
    const row = screen.getByRole('listitem')
    // Arabic digits and unit from the locale, not a hard-coded English format.
    expect(row).toHaveTextContent(formatFileSize(2_400_000, 'ar-EG'))
    await user().click(screen.getByRole('button', { name: 'Remove تقرير.csv' }))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
