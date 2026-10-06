'use client'

import { ArrowDownToLine, Check, Clock, Paperclip, RotateCcw, TriangleAlert, Upload, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/cn'
import { Button, IconButton } from '../button/button'
import { Progress } from '../progress/progress'
import {
  type FileRejection,
  describeAccept,
  formatFileSize,
  validateFiles,
} from './file-upload-utils'

/**
 * A place to put files: a dropzone with a real button in it, and a list of
 * what was put there and how far each file has got.
 *
 * ── the keyboard path is a button, not the dropzone ──
 * Dragging is a pointer gesture with no keyboard equivalent, so the zone
 * itself is not focusable and has no role; a focusable `div role="button"`
 * that only works with a mouse is worse than none. The control is a real
 * `<button>` that opens a native `<input type="file">` hidden with the
 * `hidden` attribute. The input is not the focus target because a file input
 * names itself ("Choose file, no file chosen") in a voice the system does not
 * control, and Safari keeps it out of the Tab order unless a setting is on.
 * Pressing anywhere else in the zone also opens the picker, as a convenience
 * for the pointer.
 *
 * ── inside Field ──
 * `{...control}` lands on the button, so Field's label names it — the same
 * way a Select trigger is named "Region" rather than by its contents — and the
 * accepted types and size limit are added to its description, ahead of
 * Field's own hint, so a screen reader hears the rules before choosing.
 *
 * ── dragging is said, not only shown ──
 * While files are over the zone the gold band beneath the cut is revealed,
 * the arrow changes to a drop glyph, and the headline changes to "Drop to add
 * 3 files". The same sentence goes to a polite live region. Colour is the
 * weakest of the three signals; in forced colours it is gone and the words
 * still carry the state.
 *
 * ── the picker's filter is advice ──
 * `accept` is passed to the native input, but every platform lets the person
 * switch its filter to "All files", and drag and drop never applies it. The
 * component validates every file again and states each rejection in a
 * sentence that names the file and the rule ("budget.xlsx is 14.2 MB; the
 * limit is 10 MB."). Rejected files are never added to the list: a row for a
 * file that will not be sent reads as a file that will.
 *
 * ── who uploads ──
 * Give `onUpload` and the component drives the transfer: it calls it once per
 * file, at most `maxConcurrent` at a time, with an `AbortSignal` and an
 * `onProgress` callback, and moves the row through queued → uploading → done
 * or failed. Remove aborts the signal; Retry calls `onUpload` again. Without
 * `onUpload` it is a picker: files are listed as attached and, when `name` is
 * set, submitted with the form through the native input.
 *
 * ── where focus goes on remove ──
 * Removing a row deletes the button that had focus. Focus moves to the next
 * row's Remove button, or the previous one, or the browse button when the
 * list empties — never to the document body, which would throw a keyboard
 * user back to the top of the page.
 */

export type FileUploadStatus = 'attached' | 'queued' | 'uploading' | 'done' | 'failed'

export interface FileUploadItem {
  id: string
  name: string
  /** Bytes. */
  size: number
  type?: string
  /** The file itself. Needed for Retry; absent for a file that only exists on the server. */
  file?: File
  status: FileUploadStatus
  /** 0–1 while uploading, or `null` while the size of the work is unknown. */
  progress?: number | null
  /** Why it failed, in a sentence. Shown under the row. */
  error?: string
}

export interface UploadContext {
  /** Aborted when the row is removed or the component unmounts. */
  signal: AbortSignal
  /** Report progress as a fraction from 0 to 1, or `null` while it is unknown. */
  onProgress: (fraction: number | null) => void
}

export interface FileUploadMessages {
  /** Before the browse button: "Drag files here, or". */
  prompt: (multiple: boolean) => string
  browse: (multiple: boolean) => string
  /** The headline and announcement while files are over the zone. `count` is 0 when the browser does not say. */
  dropToAdd: (count: number) => string
  /** Announced after a batch is handled. */
  added: (accepted: number, rejected: number) => string
  removed: (name: string) => string
  status: Record<FileUploadStatus, string>
  remove: (name: string) => string
  retry: (name: string) => string
  /** The visible Retry label; `retry` is its full accessible name. */
  retryShort: string
  /** Announced when a file finishes or fails. */
  settled: (name: string, status: FileUploadStatus) => string
  rejectType: (name: string, accepted: string) => string
  rejectSize: (name: string, size: string, limit: string) => string
  rejectCount: (name: string, max: number) => string
  /** The constraint line: "JSONL or CSV · up to 25 MB". Either part may be null. */
  constraints: (types: string | null, limit: string | null, maxFiles: number | undefined) => string | null
  /** Accessible name of the file list. */
  list: string
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const defaultFileUploadMessages: FileUploadMessages = {
  prompt: (multiple) => (multiple ? 'Drag files here, or' : 'Drag a file here, or'),
  browse: (multiple) => (multiple ? 'Browse files' : 'Browse'),
  dropToAdd: (count) => (count > 0 ? `Drop to add ${count} ${plural(count, 'file', 'files')}` : 'Drop to add files'),
  added: (accepted, rejected) => {
    const parts = []
    if (accepted > 0) parts.push(`Added ${accepted} ${plural(accepted, 'file', 'files')}.`)
    if (rejected > 0) parts.push(`${rejected} ${plural(rejected, 'file was', 'files were')} not added.`)
    return parts.join(' ')
  },
  removed: (name) => `Removed ${name}.`,
  status: { attached: 'Attached', queued: 'Queued', uploading: 'Uploading', done: 'Uploaded', failed: 'Failed' },
  remove: (name) => `Remove ${name}`,
  retry: (name) => `Retry ${name}`,
  retryShort: 'Retry',
  settled: (name, status) => (status === 'done' ? `${name} uploaded.` : `${name} failed to upload.`),
  rejectType: (name, accepted) => `${name} is not an accepted type. Use ${accepted}.`,
  rejectSize: (name, size, limit) => `${name} is ${size}; the limit is ${limit}.`,
  rejectCount: (name, max) => `${name} was not added: the limit is ${max} ${plural(max, 'file', 'files')}.`,
  constraints: (types, limit, maxFiles) => {
    const parts = []
    if (types) parts.push(types)
    if (limit) parts.push(`up to ${limit}${maxFiles !== undefined && maxFiles > 1 ? ' each' : ''}`)
    if (maxFiles !== undefined && maxFiles > 1) parts.push(`${maxFiles} files at most`)
    return parts.length > 0 ? parts.join(' · ') : null
  },
  list: 'Files',
}

export interface FileUploadProps {
  /** Native `accept`: `.jsonl,.csv`, `application/pdf`, `image/*`. Enforced on drop as well as in the picker. */
  accept?: string
  /** Bytes, per file. */
  maxSize?: number
  /** Total files in the list, including ones already there. */
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  /** Submitted with a form when there is no `onUpload`. */
  name?: string
  /** Locale for sizes and lists. Omit to use the runtime's locale. */
  locale?: Intl.LocalesArgument
  /** Rows to start with: files already on the server, or a fixed state for a demo. */
  defaultFiles?: FileUploadItem[]
  /** Upload one file. Resolve when done; reject with an Error whose message says why. */
  onUpload?: (file: File, context: UploadContext) => Promise<void>
  /** How many `onUpload` calls run at once. */
  maxConcurrent?: number
  /** Every change to the list: added, progressed, finished, failed, removed. */
  onFilesChange?: (files: FileUploadItem[]) => void
  /** Files turned away, with the rule each broke. */
  onReject?: (rejections: FileRejection[]) => void
  /** Copy, for another language. Merged over the English defaults. */
  messages?: Partial<FileUploadMessages>
  className?: string
  /* Field wiring, spread from `{...control}`. */
  id?: string
  required?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-label'?: string
}

let nextId = 0
const makeId = () => `upload-${++nextId}`

export function FileUpload({
  accept,
  maxSize,
  maxFiles,
  multiple = false,
  disabled = false,
  name,
  locale,
  defaultFiles,
  onUpload,
  maxConcurrent = 2,
  onFilesChange,
  onReject,
  messages: messageOverrides,
  className,
  id,
  required,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  'aria-label': ariaLabel,
}: FileUploadProps) {
  const t = { ...defaultFileUploadMessages, ...messageOverrides }
  const uid = React.useId()
  const constraintsId = `${uid}-constraints`
  const inputRef = React.useRef<HTMLInputElement>(null)
  const browseRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const [items, setItems] = React.useState<FileUploadItem[]>(() => defaultFiles ?? [])
  const [rejections, setRejections] = React.useState<FileRejection[]>([])
  const [drag, setDrag] = React.useState<{ count: number } | null>(null)
  const [announcement, setAnnouncement] = React.useState('')
  const dragDepth = React.useRef(0)
  const controllers = React.useRef(new Map<string, AbortController>())
  const onUploadRef = React.useRef(onUpload)
  const onFilesChangeRef = React.useRef(onFilesChange)
  const messagesRef = React.useRef(t)
  React.useEffect(() => {
    onUploadRef.current = onUpload
    onFilesChangeRef.current = onFilesChange
    messagesRef.current = t
  })

  const invalid = ariaInvalid === true || ariaInvalid === 'true'
  const types = describeAccept(accept, locale)
  const limit = maxSize !== undefined ? formatFileSize(maxSize, locale) : null
  const constraints = t.constraints(types, limit, multiple ? maxFiles : undefined)
  const full = maxFiles !== undefined && items.length >= maxFiles

  const update = React.useCallback((itemId: string, patch: Partial<FileUploadItem>) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)))
  }, [])

  // Report every change after it renders, not from inside a state updater,
  // which React may call twice.
  const reported = React.useRef(items)
  React.useEffect(() => {
    if (reported.current === items) return
    reported.current = items
    onFilesChangeRef.current?.(items)
  }, [items])

  // The pump: start queued rows while there is room. Rows a caller passed in
  // as already uploading count against the limit, so a demo state holds.
  React.useEffect(() => {
    const upload = onUploadRef.current
    if (!upload) return
    let active = items.filter((item) => item.status === 'uploading').length
    for (const item of items) {
      if (active >= maxConcurrent) break
      if (item.status !== 'queued' || !item.file || controllers.current.has(item.id)) continue
      active += 1
      const controller = new AbortController()
      controllers.current.set(item.id, controller)
      const { signal } = controller
      update(item.id, { status: 'uploading', progress: null, error: undefined })
      upload(item.file, {
        signal,
        onProgress: (fraction) => {
          if (!signal.aborted) update(item.id, { progress: fraction === null ? null : Math.min(1, Math.max(0, fraction)) })
        },
      })
        .then(() => {
          if (signal.aborted) return
          update(item.id, { status: 'done', progress: 1 })
          setAnnouncement(messagesRef.current.settled(item.name, 'done'))
        })
        .catch((error: unknown) => {
          if (signal.aborted) return
          update(item.id, { status: 'failed', error: error instanceof Error ? error.message : String(error) })
          setAnnouncement(messagesRef.current.settled(item.name, 'failed'))
        })
        .finally(() => {
          controllers.current.delete(item.id)
        })
    }
  }, [items, maxConcurrent, update])

  React.useEffect(() => {
    const running = controllers.current
    return () => {
      for (const controller of running.values()) controller.abort()
      running.clear()
    }
  }, [])

  // Without onUpload the native input is what a form submits, so it is kept
  // holding exactly the listed files. DataTransfer is the one way to build a
  // FileList; where it does not exist the input simply keeps the last pick.
  React.useEffect(() => {
    const input = inputRef.current
    if (!input || !name || onUpload || typeof DataTransfer === 'undefined') return
    const transfer = new DataTransfer()
    for (const item of items) if (item.file) transfer.items.add(item.file)
    input.files = transfer.files
  }, [items, name, onUpload])

  function addFiles(list: readonly File[]) {
    if (disabled || list.length === 0) return
    const batch = multiple ? list : list.slice(0, 1)
    const existing = multiple ? items.length : 0
    const { accepted, rejected } = validateFiles(batch, { accept, maxSize, maxFiles, existing })
    const status: FileUploadStatus = onUploadRef.current ? 'queued' : 'attached'
    const added = accepted.map(
      (file): FileUploadItem => ({ id: makeId(), name: file.name, size: file.size, type: file.type, file, status }),
    )
    if (added.length > 0) {
      if (!multiple) for (const controller of controllers.current.values()) controller.abort()
      setItems((current) => (multiple ? [...current, ...added] : added))
    }
    setRejections(rejected)
    if (rejected.length > 0) onReject?.(rejected)
    setAnnouncement(t.added(accepted.length, rejected.length))
  }

  function remove(item: FileUploadItem) {
    controllers.current.get(item.id)?.abort()
    controllers.current.delete(item.id)
    const index = items.findIndex((candidate) => candidate.id === item.id)
    const neighbour = items[index + 1] ?? items[index - 1]
    setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    setAnnouncement(t.removed(item.name))
    requestAnimationFrame(() => {
      const target = neighbour
        ? listRef.current?.querySelector<HTMLElement>(`[data-remove="${neighbour.id}"]`)
        : browseRef.current
      target?.focus()
    })
  }

  function retry(item: FileUploadItem) {
    update(item.id, { status: 'queued', progress: null, error: undefined })
  }

  function openPicker() {
    if (!disabled && !(multiple && full)) inputRef.current?.click()
  }

  function draggedFileCount(event: React.DragEvent) {
    const transfer = event.dataTransfer
    if (!transfer) return 0
    return Array.from(transfer.items ?? []).filter((item) => item.kind === 'file').length
  }

  function carriesFiles(event: React.DragEvent) {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files')
  }

  const dragging = drag !== null
  const headline = dragging ? t.dropToAdd(drag.count) : null
  const describedByIds = [constraints ? constraintsId : null, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div data-slot="file-upload" className={cn('flex flex-col gap-3', className)}>
      <div
        data-slot="file-upload-dropzone"
        data-dragging={dragging ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-invalid={invalid ? '' : undefined}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return
          openPicker()
        }}
        onDragEnter={(event) => {
          if (disabled || !carriesFiles(event)) return
          event.preventDefault()
          dragDepth.current += 1
          if (dragDepth.current === 1) {
            const count = draggedFileCount(event)
            setDrag({ count })
            setAnnouncement(t.dropToAdd(count))
          }
        }}
        onDragOver={(event) => {
          if (!carriesFiles(event)) return
          // Without preventDefault the browser refuses the drop and opens the
          // file in the tab instead, which loses the form.
          event.preventDefault()
          if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
        }}
        onDragLeave={() => {
          if (dragDepth.current === 0) return
          dragDepth.current -= 1
          if (dragDepth.current === 0) {
            setDrag(null)
            setAnnouncement('')
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setDrag(null)
          addFiles(Array.from(event.dataTransfer?.files ?? []))
        }}
        className={cn(
          'relative flex flex-wrap items-center gap-x-4 gap-y-3 p-(--control-px) py-5',
          'bg-cloth-pale relleno-field text-ink shadow-cut band-oro [--cut-reveal:3px] cursor-pointer',
          'transition-[box-shadow,background-color] duration-(--motion-cut) ease-cut',
          'hover:cut-band',
          // Dragging: the band is revealed wider than a hover, and the field
          // takes the gold wash, so the target reads from across the screen.
          'data-dragging:cut-band data-dragging:bg-oro-soft data-dragging:bg-none data-dragging:[--cut-reveal:5px]',
          'data-invalid:band-rojo data-invalid:cut-band',
          // Stated, not faded: shade field, muted ink, keyline kept.
          'data-disabled:cursor-not-allowed data-disabled:bg-cloth-shade data-disabled:bg-none data-disabled:text-ink-muted data-disabled:hover:shadow-cut',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'grid size-10 shrink-0 place-items-center bg-cloth shadow-cut [&_svg]:size-5',
            dragging && 'bg-ink text-on-ink forced-selected',
            disabled && 'bg-cloth-shade text-ink-muted',
          )}
        >
          {dragging ? <ArrowDownToLine /> : <Upload />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {headline ? (
            <span className="font-ui text-base font-semibold leading-snug">{headline}</span>
          ) : (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base leading-snug">
              <span className={disabled ? 'text-ink-muted' : 'text-ink-2'}>{t.prompt(multiple)}</span>
              <Button
                ref={browseRef}
                id={id}
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled || (multiple && full)}
                aria-label={ariaLabel}
                aria-describedby={describedByIds}
                aria-invalid={invalid || undefined}
                onClick={openPicker}
              >
                {t.browse(multiple)}
              </Button>
            </span>
          )}
          {constraints ? (
            <span id={constraintsId} className="text-xs leading-snug text-ink-muted tabular-nums">
              {constraints}
            </span>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          tabIndex={-1}
          name={name}
          accept={accept}
          multiple={multiple}
          required={required && items.length === 0}
          disabled={disabled}
          onChange={(event) => {
            addFiles(Array.from(event.currentTarget.files ?? []))
            // Cleared so choosing the same file again (after removing it, or
            // to retry a rejected one) still fires a change.
            if (!name || onUpload) event.currentTarget.value = ''
          }}
        />
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {rejections.length > 0 ? (
        <ul data-slot="file-upload-rejections" className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rejections.map(({ file, reason }, index) => (
            <li key={`${file.name}-${index}`} className="flex items-start gap-2 text-xs leading-snug font-medium text-ink-danger">
              <span aria-hidden className="mt-[0.3em] size-2 shrink-0 bg-rojo shadow-cut forced-ink" />
              <span className="min-w-0 break-words">
                {reason === 'type'
                  ? t.rejectType(file.name, types ?? '')
                  : reason === 'size'
                    ? t.rejectSize(file.name, formatFileSize(file.size, locale), limit ?? '')
                    : t.rejectCount(file.name, maxFiles ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <ul ref={listRef} aria-label={t.list} data-slot="file-upload-list" className="m-0 flex list-none flex-col p-0 shadow-cut">
          {items.map((item) => (
            <FileRow
              key={item.id}
              item={item}
              locale={locale}
              messages={t}
              canRetry={Boolean(item.file && onUpload)}
              disabled={disabled}
              onRemove={() => remove(item)}
              onRetry={() => retry(item)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const STATUS_GLYPH: Record<FileUploadStatus, React.ReactNode> = {
  attached: <Paperclip />,
  queued: <Clock />,
  uploading: <Upload />,
  done: <Check strokeWidth={2.5} />,
  failed: <TriangleAlert />,
}

const STATUS_INK: Record<FileUploadStatus, string> = {
  attached: 'text-ink-2',
  queued: 'text-ink-muted',
  uploading: 'text-ink',
  done: 'text-ink-success',
  failed: 'text-ink-danger',
}

interface FileRowProps {
  item: FileUploadItem
  locale?: Intl.LocalesArgument
  messages: FileUploadMessages
  canRetry: boolean
  disabled: boolean
  onRemove: () => void
  onRetry: () => void
}

/**
 * One file: status glyph and word, name, size, actions, and — while it moves
 * — a progress bar. The status word is part of the row's text rather than an
 * icon with a tooltip, so "Failed" survives greyscale, forced colours and a
 * screen reader reading the row in order.
 */
function FileRow({ item, locale, messages: t, canRetry, disabled, onRemove, onRetry }: FileRowProps) {
  const percent =
    item.status === 'uploading' && typeof item.progress === 'number'
      ? new Intl.NumberFormat(locale, { style: 'percent' }).format(item.progress)
      : null
  return (
    <li
      data-slot="file-upload-item"
      data-status={item.status}
      className="flex flex-col gap-2 px-(--control-px) py-3 not-last:border-b not-last:border-keyline-soft"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className={cn('flex shrink-0 [&_svg]:size-4', STATUS_INK[item.status])}>
          {STATUS_GLYPH[item.status]}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          {/* Names and sizes are isolated with <bdi>: in a right-to-left
              page an English "4.8 MB" otherwise reorders to "MB 4.8", and a
              name that starts with digits jumps to the wrong end. */}
          <bdi className="min-w-0 truncate text-sm font-medium text-ink" title={item.name}>
            {item.name}
          </bdi>
          <span className="flex items-baseline gap-x-2 text-xs text-ink-muted tabular-nums">
            <bdi>{formatFileSize(item.size, locale)}</bdi>
            <span aria-hidden>·</span>
            <span className={cn('font-semibold', STATUS_INK[item.status])}>
              {t.status[item.status]}
              {percent ? ` ${percent}` : null}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.status === 'failed' && canRetry ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              // The name starts with the visible word, so voice control's
              // "click Retry" still finds it (WCAG 2.5.3).
              aria-label={t.retry(item.name)}
              icon={<RotateCcw />}
              onClick={onRetry}
            >
              {t.retryShort}
            </Button>
          ) : null}
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            data-remove={item.id}
            disabled={disabled}
            label={t.remove(item.name)}
            onClick={onRemove}
          >
            <X />
          </IconButton>
        </div>
      </div>
      {item.status === 'uploading' ? (
        <Progress
          aria-label={`${t.status.uploading} ${item.name}`}
          value={typeof item.progress === 'number' ? item.progress * 100 : null}
          showValue={false}
          size="sm"
        />
      ) : null}
      {item.status === 'failed' && item.error ? (
        <p className="m-0 ps-7 text-xs leading-snug text-ink-danger">{item.error}</p>
      ) : null}
    </li>
  )
}
