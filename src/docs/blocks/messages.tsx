import { Code } from '../../components/code'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table'
import { defaultMessages } from '../../lib/default-messages'

/**
 * Every built-in word, read from `defaultMessages`, the table a translation
 * starts from. Nothing is restated here, so the page lists exactly the keys
 * `MessagesProvider` accepts.
 */

type Row = { key: string; english: string }

const isPlural = (value: object) => 'other' in value

function rows(table: Record<string, unknown>, prefix = ''): Row[] {
  return Object.entries(table).flatMap(([key, value]): Row[] => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') return [{ key: path, english: value }]
    if (typeof value === 'object' && value !== null) {
      if (isPlural(value)) {
        return [
          {
            key: path,
            english: Object.entries(value)
              .map(([category, text]) => `${category}: ${String(text)}`)
              .join(' · '),
          },
        ]
      }
      return rows(value as Record<string, unknown>, path)
    }
    return []
  })
}

export const MESSAGE_NAMESPACES = Object.keys(defaultMessages).sort()

export function messageRows(namespace: string): Row[] {
  return rows(defaultMessages[namespace as keyof typeof defaultMessages] as unknown as Record<string, unknown>)
}

export function MessagesTable() {
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-6 font-ui text-sm text-ink">
      {MESSAGE_NAMESPACES.map((namespace) => (
        <section key={namespace} className="grid gap-2">
          <h3 className="m-0 text-sm font-semibold">
            <Code>{namespace}</Code>
          </h3>
          <Table framed aria-label={`${namespace} messages`}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Key</TableHead>
                <TableHead>English</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messageRows(namespace).map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="whitespace-normal [overflow-wrap:anywhere]">
                    <Code>{row.key}</Code>
                  </TableCell>
                  <TableCell className="whitespace-normal text-ink-2">{row.english}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  )
}
