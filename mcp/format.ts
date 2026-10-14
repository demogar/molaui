import type { Component, Data, Pattern, Token } from './data'

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
          (p) => `| \`${p.name}\`${p.required ? ' (required)' : ''} | \`${cell(p.type)}\` | ${p.default ? `\`${cell(p.default)}\`` : ''} | ${cell(p.description ?? '')} |`,
        ),
        '',
      )
    }
    if (x.inherits?.length) out.push(`Also accepts the props of ${x.inherits.map((n) => `\`${n}\``).join(', ')}.`, '')
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

export function tokensMarkdown(rows: Token[], density: Record<string, Record<string, string>> | null) {
  const out = [
    '| Token | Role | Light | Dark |',
    '| --- | --- | --- | --- |',
    ...rows.map((t) => `| \`${t.name}\` | ${cell([t.group, t.note].filter(Boolean).join(': '))} | \`${cell(t.light)}\` | \`${cell(t.dark)}\` |`),
  ]
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
    list(m.rules.map((r) => `${r.rule} ${r.why}`)),
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
    '## Lifecycle phases',
    '',
    list(Object.values(m.phases).map((p) => `${p.label}: ${p.promise}`)),
    '',
    `Docs: ${m.storybook}`,
  ])
}
