import { Layout } from '../pages/layout'
import ShowPage from '../pages/show'
import HomePage from '../pages/home'
import ErrorPage from '../pages/error-page'

export const pagelist = [
  { name: '主页', path: '/' },
  { name: '登录', path: '/login' }
]

export const router_path = [
  {
    path: '/',
    element: <Layout Fit={false} />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'show',
        element: <ShowPage />
      },

      {
        path: '/',
        element: <HomePage />
      }
    ]
  }
]
