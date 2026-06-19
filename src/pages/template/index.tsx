import { UEProvider } from 'ue-connect'
import App from './App'
import { createRoot } from 'react-dom/client'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <>
    <UEProvider>
      <App />
    </UEProvider>
  </>
)
