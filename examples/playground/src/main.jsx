// The setup from Getting started: the faces, the compiled stylesheet and the
// app root, so what you try here is what your app will do.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/alegreya/wght.css'
import '@fontsource-variable/martian-mono/wdth.css'
import '@demogar/mola-ui/styles.css'

import { DirectionProvider, ToastProvider } from '@demogar/mola-ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DirectionProvider direction="ltr">
      <ToastProvider>
        <App />
      </ToastProvider>
    </DirectionProvider>
  </StrictMode>,
)
