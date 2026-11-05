import { createBrowserRouter } from 'react-router'
import { AdminDocumentDetailPage } from '@/pages/admin-document-detail'
import { AdminDocumentsPage } from '@/pages/admin-documents'
import { LoginPage } from '@/pages/login'
import { WorkspacePage } from '@/pages/workspace'
import { AdminGuard } from './AdminGuard'
import { AuthGuard } from './AuthGuard'

export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGuard />,
    children: [
      { path: '/', element: <WorkspacePage /> },
      {
        element: <AdminGuard />,
        children: [
          { path: '/admin/documents', element: <AdminDocumentsPage /> },
          { path: '/admin/documents/:id', element: <AdminDocumentDetailPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
