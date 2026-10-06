/**
 * A JSON tokenizer, not a syntax highlighter.
 *
 * Tool-call arguments and results are JSON, and the thing an operator scans a
 * payload for is almost always a VALUE — which id, which threshold, which
 * flag. So the layers are spent on value kinds and the keys stay ink:
 *
 *   key      ink        (structure, the thing you read past)
 *   string   verde
 *   number   añil
 *   boolean  rojo       true / false / null — the values that flip behaviour
 *
 * No dependency. A general highlighter is 30–200 kB to colour a format with
 * six token kinds; this is one regex and it fails safe — anything it does not
 * recognise is emitted as plain text, so malformed or truncated JSON (a stream
 * cut off mid-object) still renders exactly as it arrived.
 */
export type JsonTokenKind = 'key' | 'string' | 'number' | 'literal' | 'punct' | 'plain'

export interface JsonToken {
  kind: JsonTokenKind
  text: string
}

const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],])/g

export function tokenizeJson(source: string): JsonToken[] {
  const out: JsonToken[] = []
  let last = 0
  for (const m of source.matchAll(TOKEN)) {
    const index = m.index ?? 0
    if (index > last) out.push({ kind: 'plain', text: source.slice(last, index) })
    const [whole, str, colon, num, lit, punct] = m
    if (str !== undefined) {
      out.push({ kind: colon ? 'key' : 'string', text: str })
      if (colon) out.push({ kind: 'punct', text: colon })
    } else if (num !== undefined) out.push({ kind: 'number', text: num })
    else if (lit !== undefined) out.push({ kind: 'literal', text: lit })
    else if (punct !== undefined) out.push({ kind: 'punct', text: punct })
    else out.push({ kind: 'plain', text: whole })
    last = index + whole.length
  }
  if (last < source.length) out.push({ kind: 'plain', text: source.slice(last) })
  return out
}

export const JSON_TOKEN_CLASS: Record<JsonTokenKind, string> = {
  key: 'text-ink',
  string: 'text-verde',
  number: 'text-anil',
  literal: 'text-rojo-deep',
  punct: 'text-ink-muted',
  plain: '',
}
