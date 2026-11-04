import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LoginPage } from '@/pages/login'
import { SearchPage } from '@/pages/search'
import { DocumentViewerPage } from '@/pages/document-viewer'
import { GraphPage } from '@/pages/graph'
import { AlertsPage } from '@/pages/alerts'
import { AdminDocumentsPage } from '@/pages/admin-documents'
import { AdminSourcesPage } from '@/pages/admin-sources'
import { AdminPermissionsPage } from '@/pages/admin-permissions'
import { AuthGuard, AdminGuard } from './guards'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [
      { path: '/', element: <SearchPage /> },
      { path: '/documents/:docId', element: <DocumentViewerPage /> }, // ?v=버전&cite=근거ID
      { path: '/graph', element: <GraphPage /> },
      { path: '/alerts', element: <AlertsPage /> },
      {
        path: '/admin',
        element: <AdminGuard />,
        children: [
          { path: 'documents', element: <AdminDocumentsPage /> },
          { path: 'sources', element: <AdminSourcesPage /> },
          { path: 'permissions', element: <AdminPermissionsPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
