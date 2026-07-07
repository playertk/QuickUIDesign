import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { router_path } from '@/pages/route-template/router'
import { UEProvider } from 'ue-connect'

// Global error catcher for CEF debugging
window.addEventListener('error', (e) => {
  console.error('[ClickDeck:cef] Uncaught error:', e.message, '\n  at', e.filename, ':', e.lineno)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[ClickDeck:cef] Unhandled promise rejection:', e.reason)
})

//创建内存路由
const router = createMemoryRouter(router_path)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
  <>
    <UEProvider>
      <RouterProvider router={router} />
    </UEProvider>
  </>
)
