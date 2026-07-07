import { UEProvider } from 'ue-connect'
import App from './App'
import { createRoot } from 'react-dom/client'

// Global error catcher for CEF debugging
window.addEventListener('error', (e) => {
  console.error('[ClickDeck:cef] Uncaught error:', e.message, '\n  at', e.filename, ':', e.lineno)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[ClickDeck:cef] Unhandled promise rejection:', e.reason)
})

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <>
    <UEProvider>
      <App />
    </UEProvider>
  </>
)
