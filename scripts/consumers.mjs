// Consumer smoke test: installs the packed library into real apps, builds them
// for production and checks the result in a browser.
//   npm run build && node scripts/consumers.mjs [fixture...]
//   MOLA_CONSUMERS_KEEP=1 keeps the temp dir for inspection.
//
// The unit tests and Storybook both import from src/ through the `@/` alias,
// so neither can see a broken `exports` map, a stylesheet missing from the
// tarball, an `@source` path that no longer finds the classes, or a module
// that a React Server Component cannot import. Only an app that installs the
// tarball, the way a user installs it from npm, can. Each fixture in
// test/consumers is one documented way of consuming the package:
//
//   vite-react     the precompiled `styles.css`, no Tailwind in the app
//   vite-tailwind  the app's own Tailwind v4 build with `tailwind.css` + @source
//   next           App Router, the page a server component (the RSC check);
//                  its root layout and the components it renders beside the
//                  page are Getting started's own code blocks, so the docs
//                  compile against the tarball (scripts/doc-snippets.mjs).
//                  It loads the faces from Fontsource and starts with a
//                  stored Dark theme, to prove the no-flash script.
//   vite-existing  `components.css`, the entry for an app that already has
//                  its own page styles: the host page must keep them
//   node-require   no bundler: `require()` from plain Node, and one Base UI
//                  copy shared by the app and the package
//   eslint         the `@demogar/mola-ui/eslint` plugin loaded by the app's
//                  own ESLint 9: a file that breaks the rules gets exactly
//                  the expected errors and warning, and a clean one none
//
// A fixture with a `check` script and no entry in SERVE is not built or
// opened in a browser: its check script is the whole test.
//
// Then the `mola-ui-mcp` bin: the tarball is unpacked with no node_modules
// beside it and the bin is started over stdio with the MCP SDK's client, so
// a bundle that still needs a package at run time, or a docs/ai file missing
// from `files`, fails here rather than in a user's `npx`. The ESLint plugin
// is imported from the same kind of bare unpack, which proves it needs no
// package at run time (the eslint fixture has the library's dependencies
// installed, so it could not show that).
//
// Fixtures are copied to a temp dir before installing, so the repo tree is
// never touched, and the library goes in as `file:<tarball>` from `npm pack`
// rather than a workspace link: a link would resolve the library's own
// node_modules and hide a dependency that is missing from package.json.
//
// It does not build the library; it packs whatever is in dist/, so CI runs it
// after `npm run build`.
import { execFileSync, spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { chromium } from 'playwright'

import { docSnippets } from './doc-snippets.mjs'

const root = resolve(import.meta.dirname, '..')
const fixturesDir = join(root, 'test/consumers')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

// How each fixture's production build is served. Vite's output is static, so
// the repo's own static server is enough; Next needs its server for the RSC
// payload.
const SERVE = {
  'vite-react': (dir, port) => ['node', [join(root, 'scripts/serve-static.mjs'), join(dir, 'dist'), String(port)]],
  'vite-tailwind': (dir, port) => ['node', [join(root, 'scripts/serve-static.mjs'), join(dir, 'dist'), String(port)]],
  'vite-existing': (dir, port) => ['node', [join(root, 'scripts/serve-static.mjs'), join(dir, 'dist'), String(port)]],
  next: (dir, port) => [join(dir, 'node_modules/.bin/next'), ['start', '-p', String(port)]],
}

const all = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const wanted = process.argv.slice(2)
const unknown = wanted.filter((name) => !all.includes(name))
if (unknown.length) fail(`unknown fixture(s): ${unknown.join(', ')}. Have: ${all.join(', ')}`)
const fixtures = wanted.length ? wanted : all
const scriptOnly = (name) => Boolean(JSON.parse(readFileSync(join(fixturesDir, name, 'package.json'), 'utf8')).scripts?.check)
for (const name of fixtures) {
  if (!SERVE[name] && !scriptOnly(name)) fail(`fixture "${name}" has neither a serve command in scripts/consumers.mjs nor a check script`)
}

if (!['dist/index.js', 'dist/mola-ui.css', 'dist/mola-ui-components.css', 'dist/mcp/mola-ui-mcp.js', 'dist/eslint/index.js'].every((file) => existsSync(join(root, file)))) {
  fail('dist/ is missing or incomplete. Run `npm run build` first.')
}

const tmp = mkdtempSync(join(tmpdir(), 'mola-consumers-'))
const started = performance.now()
const results = []

try {
  const packed = time(() =>
    JSON.parse(execFileSync(npm, ['pack', '--pack-destination', tmp, '--json'], { cwd: root, encoding: 'utf8' })),
  )
  const tarball = join(tmp, packed.value[0].filename)
  log(`packed ${packed.value[0].filename} (${packed.ms} ms)`)

  const browser = await chromium.launch()
  try {
    for (const name of fixtures) results.push(await runFixture(name, tarball, browser))
  } finally {
    await browser.close()
  }
  results.push(await checkMcp(tarball))
  results.push(checkEslintBare(tarball))
} finally {
  if (process.env.MOLA_CONSUMERS_KEEP) log(`kept ${tmp}`)
  else rmSync(tmp, { recursive: true, force: true })
}

console.log('\nfixture         install    build    check   result')
for (const r of results) {
  const cell = (ms) => (ms === undefined ? '-' : `${(ms / 1000).toFixed(1)}s`).padStart(8)
  console.log(`${r.name.padEnd(14)} ${cell(r.install)} ${cell(r.build)} ${cell(r.check)}   ${r.errors.length ? 'FAIL' : 'ok'}`)
}
console.log(`total ${((performance.now() - started) / 1000).toFixed(1)}s`)

const failed = results.filter((r) => r.errors.length)
if (failed.length) {
  for (const r of failed) {
    console.error(`\n✗ ${r.name}`)
    for (const error of r.errors) console.error(`  - ${error}`)
  }
  process.exit(1)
}

async function runFixture(name, tarball, browser) {
  const result = { name, errors: [] }
  const dir = join(tmp, name)
  log(`\n${name}`)

  cpSync(join(fixturesDir, name), dir, {
    recursive: true,
    filter: (src) => !/[/\\](node_modules|dist|\.next)$/.test(src),
  })
  if (name === 'next') {
    for (const snippet of docSnippets()) {
      const target = join(dir, snippet.path)
      if (!snippet.path.startsWith('app/') && existsSync(target)) {
        result.errors.push(`Getting started block at line ${snippet.line} would overwrite the fixture's own ${snippet.path}`)
        return result
      }
      mkdirSync(join(target, '..'), { recursive: true })
      writeFileSync(target, `// From src/docs/getting-started.mdx, line ${snippet.line}.\n${snippet.code}`)
    }
  }
  const pkgPath = join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.dependencies = { ...pkg.dependencies, '@demogar/mola-ui': `file:${tarball}` }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

  try {
    result.install = time(() => run(npm, ['install', '--no-audit', '--no-fund', '--loglevel=error'], dir)).ms
    log(`  installed (${result.install} ms)`)
    if (!SERVE[name]) {
      result.check = time(() => run(npm, ['run', 'check'], dir)).ms
      log(`  checked (${result.check} ms): ok`)
      return result
    }
    result.build = time(() => run(npm, ['run', 'build'], dir)).ms
    log(`  built (${result.build} ms)`)
  } catch (error) {
    result.errors.push(error.message)
    return result
  }

  const port = await freePort()
  const [cmd, args] = SERVE[name](dir, port)
  const server = spawn(cmd, args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } })
  let serverOutput = ''
  server.stdout.on('data', (chunk) => (serverOutput += chunk))
  server.stderr.on('data', (chunk) => (serverOutput += chunk))

  const checkStarted = performance.now()
  try {
    await waitForHttp(`http://localhost:${port}/`, 30_000)
    result.errors.push(...(await check(browser, `http://localhost:${port}/`, name)))
  } catch (error) {
    result.errors.push(`${error.message}\n    server output:\n${indent(serverOutput)}`)
  } finally {
    result.check = Math.round(performance.now() - checkStarted)
    server.kill()
  }
  log(`  checked (${result.check} ms)${result.errors.length ? '' : ': ok'}`)
  return result
}

/**
 * What "it works" means for a consumer, checked on computed styles rather than
 * class names: a class that is present but has no CSS behind it is exactly the
 * failure this is here to catch.
 */
async function checkMcp(tarball) {
  const result = { name: 'mcp bin', errors: [] }
  log('\nmcp bin')
  const dir = join(tmp, 'mcp-bin')
  mkdirSync(dir)
  try {
    result.install = time(() => run('tar', ['-xzf', tarball, '-C', dir], dir)).ms
  } catch (error) {
    result.errors.push(error.message)
    return result
  }
  const pkg = JSON.parse(readFileSync(join(dir, 'package/package.json'), 'utf8'))
  const bin = pkg.bin?.['mola-ui-mcp']
  if (!bin || !existsSync(join(dir, 'package', bin))) {
    result.errors.push(`package.json bin "mola-ui-mcp" (${bin}) is missing from the tarball`)
    return result
  }
  const started = performance.now()
  const client = new Client({ name: 'mola-consumers', version: '0.0.0' })
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(dir, 'package', bin)], cwd: dir, stderr: 'pipe' })
  let stderr = ''
  transport.stderr?.on('data', (chunk) => (stderr += chunk))
  try {
    await client.connect(transport)
    const version = client.getServerVersion()?.version
    if (version !== pkg.version) result.errors.push(`server says version ${version}, the package is ${pkg.version}`)
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name).sort().join(', ')
    if (names !== 'check_code, get_component, get_pattern, get_rules, get_tokens, list_components, search') result.errors.push(`unexpected tools: ${names}`)
    const button = await client.callTool({ name: 'get_component', arguments: { name: 'Button' } })
    if (!button.content?.[0]?.text?.startsWith('# Button')) result.errors.push(`get_component Button returned: ${JSON.stringify(button).slice(0, 300)}`)
    const brief = await client.callTool({ name: 'get_component', arguments: { name: 'Button', brief: true } })
    if (!brief.content?.[0]?.text?.startsWith('# Button (brief)')) result.errors.push(`get_component Button brief returned: ${JSON.stringify(brief).slice(0, 300)}`)
    const tokens = await client.callTool({ name: 'get_tokens', arguments: { filter: 'oro' } })
    if (!tokens.content?.[0]?.text?.includes('`--oro`')) result.errors.push('get_tokens "oro" did not list --oro')
    const checked = await client.callTool({ name: 'check_code', arguments: { code: '<button className="border rounded-lg">Save</button>', filename: 'save.tsx' } })
    if (!checked.content?.[0]?.text?.includes('rule 1:')) result.errors.push(`check_code did not report the border: ${JSON.stringify(checked).slice(0, 300)}`)
  } catch (error) {
    result.errors.push(`${error.message}\n    server stderr:\n${indent(stderr)}`)
  } finally {
    await client.close()
    result.check = Math.round(performance.now() - started)
  }
  log(`  checked (${result.check} ms)${result.errors.length ? '' : ': ok'}`)
  return result
}

/**
 * The plugin from a bare unpack of the tarball, nothing installed: an import
 * it left external would fail here. Its rule then runs on one bad line,
 * through the plugin's own rule object rather than ESLint, which is not
 * installed here either.
 */
function checkEslintBare(tarball) {
  const result = { name: 'eslint bare', errors: [] }
  log('\neslint bare')
  const dir = join(tmp, 'eslint-bare')
  mkdirSync(dir)
  const started = performance.now()
  try {
    run('tar', ['-xzf', tarball, '-C', dir], dir)
    const pkg = JSON.parse(readFileSync(join(dir, 'package/package.json'), 'utf8'))
    const entry = pkg.exports?.['./eslint']?.default
    if (!entry || !existsSync(join(dir, 'package', entry))) {
      result.errors.push(`package.json exports "./eslint" (${entry}) is missing from the tarball`)
      return result
    }
    const line = '<button className="border">Save</button>'
    const probe = [
      `const { default: plugin } = await import(${JSON.stringify(join(dir, 'package', entry))})`,
      'const reports = []',
      `const sourceCode = { text: ${JSON.stringify(line)}, lines: [${JSON.stringify(line)}] }`,
      "const listener = plugin.rules['design-rules'].create({ sourceCode, filename: 'save.jsx', report: (r) => reports.push(r) })",
      'listener.Program()',
      'console.log(JSON.stringify({ version: plugin.meta.version, reports: reports.map((r) => r.data.text) }))',
    ].join('\n')
    const out = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: dir, encoding: 'utf8' }))
    if (out.version !== pkg.version) result.errors.push(`plugin says version ${out.version}, the package is ${pkg.version}`)
    if (!out.reports.some((text) => text.startsWith('Rule 1:'))) result.errors.push(`design-rules did not report the border: ${JSON.stringify(out.reports)}`)
  } catch (error) {
    result.errors.push(error.message)
  } finally {
    result.check = Math.round(performance.now() - started)
  }
  log(`  checked (${result.check} ms)${result.errors.length ? '' : ': ok'}`)
  return result
}

async function check(browser, url, name) {
  const page = await browser.newPage()
  const errors = []
  // A returning visitor who chose Dark. Only the inline script in the
  // documented root layout reads it, so a dark <html> after load proves the
  // script ran, and a hydration mismatch it caused would be a console error.
  if (name === 'next') await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`))
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    // The dialog opens on mount, after hydration in the Next app.
    await page.locator('[data-slot="dialog"]').waitFor({ state: 'visible', timeout: 10_000 })

    const facts = await page.evaluate(() => {
      const transparent = (color) => color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
      const controlH = getComputedStyle(document.documentElement).getPropertyValue('--control-h').trim()
      const button = [...document.querySelectorAll('[data-slot="button"]')].find((el) => el.textContent?.includes('Run agent'))
      const dialog = document.querySelector('[data-slot="dialog"]')
      const input = document.querySelector('input[name="name"]')
      const badge = [...document.querySelectorAll('main *')].find((el) => el.textContent === 'Running' && el.children.length <= 1)
      const style = (el) => (el ? getComputedStyle(el) : undefined)
      return {
        controlH,
        button: button && {
          height: `${button.getBoundingClientRect().height}px`,
          shadow: style(button).boxShadow,
          background: style(button).backgroundColor,
        },
        dialog: dialog && {
          role: dialog.getAttribute('role'),
          inMain: Boolean(document.querySelector('main')?.contains(dialog)),
          inBody: document.body.contains(dialog),
          background: style(dialog).backgroundColor,
          width: dialog.getBoundingClientRect().width,
          transparentBackground: transparent(style(dialog).backgroundColor),
        },
        // The cut is on the Input's box, the element around the <input> that
        // takes `className` (docs/adr/0010-prop-vocabulary.md), not on the
        // <input> inside it.
        input: input && {
          label: input.labels?.[0]?.textContent ?? '',
          value: input.value,
          shadow: style(input.closest('[data-slot="input-group"]') ?? input).boxShadow,
        },
        badge: badge && { shadow: style(badge).boxShadow, background: style(badge).backgroundColor },
        buttonTransparent: button ? transparent(style(button).backgroundColor) : true,
        badgeUnstyled: badge ? transparent(style(badge).backgroundColor) && style(badge).boxShadow === 'none' : true,
        themes: Object.fromEntries(
          ['light', 'dark'].map((theme) => {
            const el = document.querySelector(`[data-probe="${theme}"]`)
            return [theme, el ? style(el).backgroundColor : undefined]
          }),
        ),
      }
    })

    if (!facts.controlH) errors.push('--control-h is not defined on :root: the tokens did not load')
    if (!facts.button) errors.push('no "Run agent" button rendered')
    else {
      if (facts.button.height !== facts.controlH)
        errors.push(`button height ${facts.button.height}, expected --control-h (${facts.controlH}): its utilities have no CSS`)
      if (facts.button.shadow === 'none') errors.push('button has no box-shadow: shadow-cut has no CSS')
      if (facts.buttonTransparent) errors.push(`button background is transparent (${facts.button.background})`)
    }
    if (!facts.input) errors.push('no input[name="name"] rendered')
    else {
      if (facts.input.label !== 'Agent name') errors.push(`input is labelled "${facts.input.label}", expected "Agent name"`)
      if (facts.input.shadow === 'none') errors.push("input's box has no box-shadow: the field is unstyled")
    }
    if (!facts.badge) errors.push('no "Running" badge rendered')
    else if (facts.badgeUnstyled) errors.push('badge has neither a background nor a box-shadow: it is unstyled')
    // The app's bundler minifies the CSS again with its own browser targets,
    // and Lightning CSS lowers light-dark() for older browsers; a token that
    // is only declared on :root then freezes to the root's scheme. Only a
    // nested theme in a real consumer build shows it.
    if (!facts.themes.light || !facts.themes.dark) errors.push('the data-theme="light"/"dark" probe sections are missing')
    else if (facts.themes.light === facts.themes.dark)
      errors.push(`a nested data-theme="dark" section paints the same ground as a light one (${facts.themes.dark}): nested theming is broken`)
    if (!facts.dialog) errors.push('no dialog rendered')
    else {
      if (facts.dialog.role !== 'dialog') errors.push(`dialog role is "${facts.dialog.role}"`)
      if (facts.dialog.inMain || !facts.dialog.inBody) errors.push('dialog is not portaled out of <main> into <body>')
      if (facts.dialog.transparentBackground) errors.push(`dialog background is transparent (${facts.dialog.background})`)
      if (facts.dialog.width < 200) errors.push(`dialog is ${facts.dialog.width}px wide: its size utilities have no CSS`)
    }
    if (name === 'next') errors.push(...(await checkNext(page)))
    if (name === 'vite-existing') errors.push(...(await checkExisting(page)))
  } catch (error) {
    errors.push(error.message)
  } finally {
    await page.close()
  }
  return errors
}

/** The Next fixture renders Getting started's root layout and theme switcher. */
async function checkNext(page) {
  const errors = []
  const facts = await page.evaluate(async () => {
    await document.fonts.ready
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, ''))
    const pressed = document.querySelector('[data-slot="segmented-control"] [aria-pressed="true"]')
    return {
      theme: document.documentElement.dataset.theme,
      density: document.documentElement.dataset.density,
      loaded,
      pressed: pressed?.textContent ?? null,
    }
  })
  if (facts.theme !== 'dark') errors.push(`<html data-theme> is "${facts.theme}" with "dark" stored: the no-flash theme script did not run`)
  if (facts.density !== 'comfortable') errors.push(`<html data-density> is "${facts.density}": the documented root layout did not render`)
  if (facts.pressed !== 'Dark') errors.push(`the theme switcher shows "${facts.pressed}" pressed with "dark" stored`)
  if (!facts.loaded.includes('Archivo Variable')) errors.push(`Archivo Variable did not load (loaded: ${facts.loaded.join(', ') || 'none'})`)
  return errors
}

/** components.css must style the components and leave the host page's own styles alone. */
async function checkExisting(page) {
  const errors = []
  const facts = await page.evaluate(() => {
    const body = getComputedStyle(document.body)
    return {
      background: body.backgroundColor,
      font: body.fontFamily,
      h1Margin: getComputedStyle(document.querySelector('h1')).marginBlockStart,
      hostButtonFont: getComputedStyle(document.querySelector('button.host')).fontFamily,
      boxSizing: getComputedStyle(document.querySelector('.host-box')).boxSizing,
    }
  })
  if (facts.background !== 'rgba(0, 0, 0, 0)') errors.push(`the host body background became ${facts.background}: components.css styled <body>`)
  if (/Archivo/.test(facts.font)) errors.push(`the host body font became ${facts.font}`)
  if (facts.h1Margin === '0px') errors.push('the host <h1> lost its margin: components.css carries a global reset')
  if (/Archivo/.test(facts.hostButtonFont)) errors.push("a host <button> inherits Mola's font: the reset is not scoped")
  if (facts.boxSizing !== 'content-box') errors.push(`a host element is ${facts.boxSizing}: the reset is not scoped`)
  return errors
}

function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } })
  } catch (error) {
    throw new Error(`\`${cmd} ${args.join(' ')}\` failed:\n${indent(`${error.stdout ?? ''}${error.stderr ?? ''}`)}`, { cause: error })
  }
}

async function waitForHttp(url, timeout) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 200))
  }
  throw new Error(`${url} did not answer 200 within ${timeout / 1000}s`)
}

function freePort() {
  return new Promise((done, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, () => {
      const { port } = server.address()
      server.close(() => done(port))
    })
  })
}

function time(fn) {
  const start = performance.now()
  const value = fn()
  return { value, ms: Math.round(performance.now() - start) }
}

function indent(text) {
  return text
    .trim()
    .split('\n')
    .slice(-60)
    .map((line) => `      ${line}`)
    .join('\n')
}

function log(message) {
  console.log(message)
}

function fail(message) {
  console.error(`consumers: ${message}`)
  process.exit(1)
}
