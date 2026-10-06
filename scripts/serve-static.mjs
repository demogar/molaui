// Serves a static build (the Storybook in storybook-static/ by default) for the
// browser audit and the visual tests.
//   node scripts/serve-static.mjs [dir] [port]
//
// The audit used to run against `npm run dev`, and stalled there: the dev
// server compiles each story on first request and holds its HMR socket open,
// so `networkidle` could take minutes for one story. A static build answers
// every request at once and is exactly what GitHub Pages publishes. A dozen
// lines of node:http rather than a dependency, because it only has to serve
// files from one folder.
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? 'storybook-static')
const port = Number(process.argv[3] ?? 6007)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  let file = join(root, normalize(path))
  if (!file.startsWith(root)) return res.writeHead(403).end()
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html')
    statSync(file)
  } catch {
    return res.writeHead(404).end()
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`))
