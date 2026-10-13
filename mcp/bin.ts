import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { loadData } from './data'
import { createServer } from './server'

/**
 * `mola-ui-mcp`: the MCP server over stdio. Built by vite.mcp.config.ts into
 * dist/mcp/mola-ui-mcp.js with the SDK bundled in, so the package gains a bin
 * and no runtime dependency. stdout is the protocol; anything for a person
 * goes to stderr.
 */
const server = createServer(loadData())
await server.connect(new StdioServerTransport())
console.error('Mola UI MCP server running on stdio')
