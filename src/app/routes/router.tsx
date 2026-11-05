import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/pages/login'
import { WorkspacePage } from '@/pages/workspace'
import { AuthGuard } from './AuthGuard'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [{ path: '/', element: <WorkspacePage /> }],
  },
]

export const router = createBrowserRouter(routes)
