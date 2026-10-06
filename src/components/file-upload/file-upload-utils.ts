/**
 * The pure half of the file upload: matching `accept`, formatting sizes and
 * validating a batch. Kept apart from the component so the rules can be
 * tested without a DOM, and so a server-side check can import the same ones.
 */

/** The units Intl can spell, smallest first. */
const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

/**
 * A byte count in the reader's locale: "14.2 MB", "14,2 MB", "١٤٫٢ م.ب".
 *
 * Steps are powers of 1000, not 1024. Intl's `megabyte` unit is the SI
 * megabyte, so dividing by 1024 and printing "MB" would state a number the
 * label contradicts — and the limit the person reads must be the limit the
 * check applies. Pass the same `locale` the rest of the form uses; leaving it
 * out uses the runtime's locale rather than a hidden "en-US".
 */
export function formatFileSize(bytes: number, locale?: Intl.LocalesArgument): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit += 1
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value)
}

function acceptTokens(accept: string | undefined): string[] {
  return (accept ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Whether a file matches an `accept` string, using the rules the native
 * picker uses: `.ext` against the name, `type/*` against the MIME prefix, an
 * exact MIME type against the type. The picker's filter is advice — every
 * platform lets the person switch it to "All files", and drag and drop skips
 * it entirely — so the component checks again rather than trusting it.
 */
export function matchesAccept(file: { name: string; type: string }, accept: string | undefined): boolean {
  const tokens = acceptTokens(accept)
  if (tokens.length === 0) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token)
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
    return type === token
  })
}

/**
 * The accepted types as a person would say them — ".jsonl or .csv" — joined
 * with the locale's own "or". MIME types are kept as written; a reader who
 * sees `application/pdf` can still act on it, and inventing friendly names
 * for every type is a table nobody maintains.
 */
export function describeAccept(accept: string | undefined, locale?: Intl.LocalesArgument): string | null {
  const tokens = acceptTokens(accept)
  if (tokens.length === 0) return null
  const list = new Intl.ListFormat(locale as string | string[] | undefined, { type: 'disjunction' })
  return list.format(tokens)
}

export type FileRejectionReason = 'type' | 'size' | 'count'

export interface FileRejection {
  file: File
  reason: FileRejectionReason
}

export interface ValidateOptions {
  accept?: string
  maxSize?: number
  maxFiles?: number
  /** How many files are already in the list, so `maxFiles` counts the whole set. */
  existing?: number
}

/**
 * Splits a batch into the files that pass and the ones that do not, each with
 * the one rule it broke. Type is checked before size, because "wrong kind of
 * file" is the more useful thing to hear about a 2 GB video dropped on a CSV
 * field. Count is checked last and in order, so the first files chosen are the
 * ones kept.
 */
export function validateFiles(files: readonly File[], options: ValidateOptions) {
  const { accept, maxSize, maxFiles, existing = 0 } = options
  const accepted: File[] = []
  const rejected: FileRejection[] = []
  for (const file of files) {
    if (!matchesAccept(file, accept)) rejected.push({ file, reason: 'type' })
    else if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: 'size' })
    else if (maxFiles !== undefined && existing + accepted.length >= maxFiles) rejected.push({ file, reason: 'count' })
    else accepted.push(file)
  }
  return { accepted, rejected }
}
