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
//   next           App Router, the page a server component (the RSC check)
//   node-require   no bundler: `require()` from plain Node, and one Base UI
//                  copy shared by the app and the package
//
// A fixture with a `check` script and no entry in SERVE is not built or
// opened in a browser: its check script is the whole test.
//
// Then the `mola-ui-mcp` bin: the tarball is unpacked with no node_modules
// beside it and the bin is started over stdio with the MCP SDK's client, so
// a bundle that still needs a package at run time, or a docs/ai file missing
// from `files`, fails here rather than in a user's `npx`.
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

const root = resolve(import.meta.dirname, '..')
const fixturesDir = join(root, 'test/consumers')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

// How each fixture's production build is served. Vite's output is static, so
// the repo's own static server is enough; Next needs its server for the RSC
// payload.
const SERVE = {
  'vite-react': (dir, port) => ['node', [join(root, 'scripts/serve-static.mjs'), join(dir, 'dist'), String(port)]],
  'vite-tailwind': (dir, port) => ['node', [join(root, 'scripts/serve-static.mjs'), join(dir, 'dist'), String(port)]],
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

if (!['dist/index.js', 'dist/mola-ui.css', 'dist/mcp/mola-ui-mcp.js'].every((file) => existsSync(join(root, file)))) {
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
    result.errors.push(...(await check(browser, `http://localhost:${port}/`)))
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

async function check(browser, url) {
  const page = await browser.newPage()
  const errors = []
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
        input: input && {
          label: input.labels?.[0]?.textContent ?? '',
          value: input.value,
          shadow: style(input).boxShadow,
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
      if (facts.input.shadow === 'none') errors.push('input has no box-shadow: the field is unstyled')
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
  } catch (error) {
    errors.push(error.message)
  } finally {
    await page.close()
  }
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
