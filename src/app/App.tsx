import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/shared/api'
import { resetOnLogout } from './model/resetOnLogout'
import { router } from './routes/router'
import './styles/index.css'

resetOnLogout()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
