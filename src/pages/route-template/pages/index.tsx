import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { router_path } from '@/pages/route-template/router'
import { UEProvider } from 'ue-connect'

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
