// An app that already has a page of its own: `components.css`, the entry
// without preflight or document-wide base styles. The host page here sets no
// styles at all, so anything the runner finds changed on it came from Mola.
import '@demogar/mola-ui/components.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
