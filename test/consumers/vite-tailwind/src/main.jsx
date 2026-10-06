// The app's own Tailwind build, with Mola's layers imported into it.
import './app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
