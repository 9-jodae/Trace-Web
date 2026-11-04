import { createBrowserRouter } from 'react-router'
import { WorkspacePage } from '@/domain/workspace/WorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WorkspacePage />,
  },
])
