import type { Finding } from './check'
import type { Component, Data, Pairing, Pattern, Scope, Token } from './data'

/**
 * Markdown for the tool results. A model reads Markdown more reliably than a
 * JSON dump of the same entry, and the section names match the docs page, so
 * "the Accessibility section" means the same thing in a chat as on the site.
 */

const nameOf = (title: string) => title.split('/').at(-1)!
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const list = (items: string[]) => items.map((line) => `- ${line}`).join('\n')

/** `?path=/docs/<id>` → `md/<id>.md`, the page's Markdown twin on the same site. */
export function markdownUrl(docs: string) {
  return docs.replace(/\?path=\/docs\/([a-z0-9-]+)$/, 'md/$1.md')
}

function join(parts: (string | false | undefined)[]) {
  return `${parts.filter((p) => p !== false && p !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

export function componentLine(c: Component, data: Data) {
  const phase = c.phase && c.phase !== 'stable' ? ` (${data.manifest.phases[c.phase]?.label ?? c.phase})` : ''
  return `- **${c.name}**${phase}: ${c.summary ?? ''} Exports: ${c.exports
    .filter((x) => x.kind === 'component')
    .map((x) => `\`${x.name}\``)
    .join(', ')}.`
}

export function componentMarkdown(c: Component, data: Data, via?: string) {
  const { manifest } = data
  const components = c.exports.filter((x) => x.kind === 'component').map((x) => x.name)
  const out: (string | false | undefined)[] = [
    `# ${c.name}`,
    '',
    via ? `\`${via}\` is documented on this page.\n` : undefined,
    c.summary,
    '',
    `Docs: ${c.docs}`,
    `Markdown: ${markdownUrl(c.docs)}`,
    c.phase ? `Status: ${manifest.phases[c.phase]?.label}. ${manifest.phases[c.phase]?.promise}` : undefined,
    c.usage?.replacedBy ? `Use ${nameOf(c.usage.replacedBy)} instead.` : undefined,
    '',
    components.length ? `\`\`\`tsx\nimport { ${components.join(', ')} } from '${manifest.name}'\n\`\`\`\n` : undefined,
    c.description,
    '',
  ]
  if (c.usage) {
    out.push('## Usage', '', '### When to use', '', list(c.usage.use), '', '### When not to', '')
    out.push(list(c.usage.avoid.map((a) => `${a.when}${a.use ? ` Use ${a.label ?? nameOf(a.use)}.` : ''}`)), '')
    if (c.usage.practices?.length) out.push('### Do and don’t', '', list(c.usage.practices.flatMap((p) => [`Do: ${p.do}`, `Don’t: ${p.dont}`])), '')
    if (c.usage.content?.length) out.push('### Content', '', list(c.usage.content), '')
  }
  if (c.anatomy) {
    out.push('## Anatomy', '', ...c.anatomy.parts.map((p, i) => `${i + 1}. ${p.name} (\`${p.selector}\`): ${p.does}`), '')
  }
  out.push('## API', '')
  for (const x of c.exports.filter((e) => e.kind !== 'type')) {
    out.push(`### \`${x.name}\` (${x.kind})`, '', x.description, '')
    if (x.variants) {
      out.push(
        list(Object.entries(x.variants).map(([k, v]) => `\`${k}\`: ${v.values.map((s) => `\`${s}\``).join(', ')}${v.default ? ` (default \`${v.default}\`)` : ''}`)),
        '',
      )
    }
    if (x.props?.length) {
      out.push(
        '| Prop | Type | Default | Description |',
        '| --- | --- | --- | --- |',
        ...x.props.map(
          (p) =>
            `| \`${p.name}\`${p.required ? ' (required)' : ''}${p.deprecated ? ' (deprecated)' : ''} | \`${cell(p.type)}\` | ${p.default ? `\`${cell(p.default)}\`` : ''} | ${cell(p.deprecated ? `Deprecated: ${p.deprecated}` : (p.description ?? ''))} |`,
        ),
        '',
      )
    }
    if (x.inherits?.length) out.push(`Also accepts the props of ${x.inherits.map((n) => `\`${n}\``).join(', ')}.`, '')
    if (x.forwards) {
      const f = x.forwards
      out.push(
        f.element === null
          ? 'Renders no element of its own, so it takes no `className` or `ref`.'
          : f.className
            ? `\`className\` goes to \`${f.className}\`; \`ref\`, \`id\` and the other DOM props go to \`${f.element}\`.`
            : `\`className\`, \`ref\`, \`id\` and the other DOM props go to \`${f.element}\`.`,
        '',
      )
    }
  }
  const types = c.exports.filter((x) => x.kind === 'type').map((x) => `\`${x.name}\``)
  if (types.length) out.push(`Types: ${types.join(', ')}`, '')
  if (c.accessibility) {
    const a = c.accessibility
    out.push('## Accessibility', '')
    if (a.keyboard?.length) out.push('| Key | What happens |', '| --- | --- |', ...a.keyboard.map((k) => `| ${k.keys.join(' or ')} | ${cell(k.action)} |`), '')
    out.push('### Mola handles', '', list(a.handles), '', '### You handle', '', list(a.you), '')
  }
  if (c.usedIn?.length) out.push('## Used in', '', list(c.usedIn.map((t) => `${nameOf(t)} (${t.startsWith('Patterns/') ? 'pattern' : 'showcase'})`)), '')
  out.push('## Examples', '', list(c.stories.map((s) => `[${s.name}](${s.url})`)), '')
  if (c.changes?.length) {
    out.push(
      '## Changes',
      '',
      list(c.changes.map((x) => `${x.version}${x.date ? ` (${x.date})` : ''}, ${x.breaking ? 'breaking ' : ''}${x.type}: ${x.subject}${x.pr ? ` (#${x.pr.number})` : ''}`)),
      '',
    )
  }
  return join(out)
}

/**
 * The page cut to what writing the code needs: what it is for, when not to
 * use it, each component export's props on one line apiece, and what the
 * accessibility section leaves to the caller. The full page is several
 * thousand tokens for the larger components (Field, Dialog), most of it
 * prose, anatomy, keyboard tables and links an agent reads once, if ever;
 * an agent composing a screen from eight components paid for all of it
 * eight times. Prop descriptions are dropped too, because the type and
 * default carry most of the meaning; the footer says what was left out and
 * how to get it, so a brief never passes for the whole page.
 */
export function componentBrief(c: Component, data: Data, via?: string) {
  const { manifest } = data
  const components = c.exports.filter((x) => x.kind === 'component')
  const out: (string | false | undefined)[] = [
    `# ${c.name} (brief)`,
    '',
    via ? `\`${via}\` is documented on this page.\n` : undefined,
    c.summary,
    '',
    c.phase && c.phase !== 'stable' ? `Status: ${manifest.phases[c.phase]?.label}. ${manifest.phases[c.phase]?.promise}` : undefined,
    c.usage?.replacedBy ? `Use ${nameOf(c.usage.replacedBy)} instead.` : undefined,
    components.length ? `\`\`\`tsx\nimport { ${components.map((x) => x.name).join(', ')} } from '${manifest.name}'\n\`\`\`\n` : undefined,
  ]
  if (c.usage) {
    out.push('## When to use', '', list(c.usage.use), '', '## When not to', '')
    out.push(list(c.usage.avoid.map((a) => `${a.when}${a.use ? ` Use ${a.label ?? nameOf(a.use)}.` : ''}`)), '')
  }
  out.push('## Props', '')
  for (const x of components) {
    const line = (x.props ?? []).map((p) => `\`${p.name}${p.required ? '' : '?'}: ${p.type.replace(/\n/g, ' ')}${p.default ? ` = ${p.default}` : ''}\``).join(', ')
    const inherits = x.inherits?.length ? `${line ? '; ' : ''}also the props of ${x.inherits.map((n) => `\`${n}\``).join(', ')}` : ''
    out.push(`- \`${x.name}\`: ${line || inherits ? `${line}${inherits}` : 'no props of its own'}`)
  }
  out.push('')
  if (c.accessibility?.you.length) out.push('## You handle', '', list(c.accessibility.you), '')
  out.push(
    `Brief: left out the description, do and don’t, content, anatomy, prop descriptions, keyboard table, examples and changes. Call get_component with brief false for the whole page, or read ${markdownUrl(c.docs)}.`,
  )
  return join(out)
}

export function patternMarkdown(p: Pattern) {
  const g = p.guidance
  const out: (string | false | undefined)[] = [`# ${nameOf(p.title)} (${p.kind})`, '', g?.summary ?? p.summary, '', `Docs: ${p.docs}`, `Markdown: ${markdownUrl(p.docs)}`, '']
  if (p.kind === 'pattern') {
    out.push('Patterns live in `src/patterns/` in the repository and are not exported by the package: copy the screen and adapt it.', '')
  }
  if (g) {
    out.push('## When to use', '', list(g.use), '', '## When not to', '', list(g.avoid.map((a) => `${a.when}${a.use ? ` Use ${a.label ?? nameOf(a.use)}.` : ''}`)), '')
    out.push('## Built from', '', list(g.parts.map((part) => `${nameOf(part.title)}: ${part.role}`)), '')
    out.push('## States', '', list(Object.entries(g.states).map(([id, s]) => `${id}: ${s.note}${s.story ? ` Story: ${s.story}` : ''}`)), '')
    out.push('## Accessibility', '', list(g.accessibility), '')
  } else {
    if (p.description) out.push(p.description, '')
    out.push('## Built from', '', list(p.builtFrom.map(nameOf)), '')
  }
  out.push('## Examples', '', list(p.stories.map((s) => `[${s.name}](${s.url})`)), '')
  return join(out)
}

const useAs = (t: Token) =>
  t.scopes ? `${t.scopes.join(', ')}${t.utilities?.length ? `: ${t.utilities.map((u) => `\`${u}\``).join(' ')}` : ''}` : ''

const pairing = (p: Pairing) => `\`${p.token}\` ≥ ${p.min}${p.themes ? ` (${p.themes.join(', ')} only)` : ''}`

/**
 * The token table, then for each colour row its promised pairings. The scopes
 * and the pairings are the point: Tailwind compiles every colour utility for
 * every token, so without them an agent cannot tell `text-cloth-pale` (wrong)
 * from `bg-cloth-pale`, or a measured pairing from a guess.
 */
export function tokensMarkdown(rows: Token[], density: Record<string, Record<string, string>> | null, scopes?: Record<string, Scope>) {
  const out = [
    '| Token | Role | Light | Dark | Use as |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((t) => `| \`${t.name}\` | ${cell([t.group, t.note].filter(Boolean).join(': '))} | \`${cell(t.light)}\` | \`${cell(t.dark)}\` | ${useAs(t)} |`),
  ]
  const paired = rows.filter((t) => t.on?.length || t.under?.length)
  if (paired.length) {
    out.push(
      '',
      '## Promised pairings',
      '',
      'Measured in both themes by the contrast test: 4.5 for text, 3 for a boundary or a mark. A pairing not listed was never measured.',
      '',
      ...paired.map((t) =>
        [
          `- \`${t.name}\``,
          t.on?.length ? ` reads on ${t.on.map(pairing).join(', ')}` : '',
          t.on?.length && t.under?.length ? ';' : '',
          t.under?.length ? ` carries ${t.under.map(pairing).join(', ')}` : '',
          '.',
        ].join(''),
      ),
    )
  }
  if (scopes && rows.some((t) => t.scopes)) {
    out.push(
      '',
      '## Scopes',
      '',
      ...Object.entries(scopes).map(([name, s]) => `- \`${name}\`: ${s.meaning} Tailwind: ${s.tailwind.map((p) => `\`${p}-\``).join(' ')}.`),
    )
  }
  if (density) {
    out.push(
      '',
      'Density is the `data-density` attribute; comfortable is the default and uses the values above. The others redefine:',
      '',
      ...Object.entries(density).flatMap(([d, values]) => [`- \`${d}\`: ${Object.entries(values).map(([n, v]) => `\`${n}: ${v}\``).join(', ')}`]),
    )
  }
  return join(out)
}

export function rulesMarkdown(data: Data) {
  const m = data.manifest
  return join([
    `# ${m.name} ${data.version}: rules`,
    '',
    m.description,
    '',
    '## Design rules',
    '',
    'Every screen built with Mola UI is reviewed against these.',
    '',
    // Numbered, because check_code cites rules by number ("rule 4").
    m.rules.map((r, i) => `${i + 1}. ${r.rule} ${r.why}`).join('\n'),
    '',
    '## Setup',
    '',
    `\`\`\`bash\n${m.install}\n\`\`\``,
    '',
    `Import \`${m.name}/styles.css\` and the three font faces once. Theme, density and direction are attributes on \`<html>\` or a subtree, not props: ${Object.entries(
      m.tokens.attributes,
    )
      .map(([attr, values]) => `\`${attr}\` (${values.join(', ')})`)
      .join(', ')}.`,
    '',
    `In an existing app, import \`${m.name}/components.css\` instead of \`styles.css\`: it scopes the reset to the components and leaves the page's own styles alone.`,
    '',
    `Mount \`DirectionProvider\`, \`ToastProvider\` and (optionally) \`TooltipProvider\` once around the app. \`useToast()\` throws without \`ToastProvider\`.`,
    '',
    '## Lifecycle phases',
    '',
    list(Object.values(m.phases).map((p) => `${p.label}: ${p.promise}`)),
    '',
    `Docs: ${m.storybook}`,
  ])
}

/** A code span that survives backticks inside it. */
const span = (s: string) => (s.includes('`') ? `\`\` ${s} \`\`` : `\`${s}\``)

/** The rules check_code cannot decide from the code alone, so a clean result does not claim them. */
export const UNCHECKED_RULES = [3, 9, 11, 14]

export function checkMarkdown(findings: Finding[], data: Data, lines: number) {
  const rules = data.manifest.rules
  const unchecked = `Not checkable from code: ${UNCHECKED_RULES.map((n) => `rule ${n} (${rules[n - 1]?.rule.split(/[.:;,(]/)[0]})`).join(', ')}. Review those by reading.`
  if (!findings.length) {
    return join(['# No findings', '', `${lines} ${lines === 1 ? 'line' : 'lines'} checked against the design rules (get_rules): nothing to change.`, '', unchecked])
  }
  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.length - errors
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const section = (severity: Finding['severity'], title: string, note: string) => {
    const items = findings.filter((f) => f.severity === severity)
    if (!items.length) return []
    return [`## ${title}`, '', note, '', ...items.map((f) => `- **Line ${f.line}**, ${f.rule ? `rule ${f.rule}` : 'check_code directive'}: ${f.message}\n  ${span(f.excerpt)}\n  Fix: ${f.fix}`), '']
  }
  const cited = [...new Set(findings.map((f) => f.rule))].filter(Boolean).sort((a, b) => a - b)
  return join([
    `# ${count(errors, 'error')}, ${count(warnings, 'warning')}`,
    '',
    ...section('error', 'Errors', 'Each breaks a design rule. Fix them before handing the code back.'),
    ...section('warn', 'Warnings', 'Probably wrong, but the code alone cannot prove it. Fix each, or keep it for a reason you can state.'),
    '## Rules cited',
    '',
    ...cited.map((n) => `${n}. ${rules[n - 1]?.rule ?? ''}`),
    '',
    unchecked,
    '',
    'To keep code that breaks a rule on purpose (a "don’t" example), put `// check_code: allow rule N — the reason` on the line above it, or `{/* check_code: allow rule N — the reason */}` in JSX. The reason is required: an allow without one is an error and excuses nothing.',
  ])
}
