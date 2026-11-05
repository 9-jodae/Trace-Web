import { Navigate, useNavigate } from 'react-router'
import { LoginForm } from '@/features/auth'
import { useTokenStore } from '@/shared/api'

export function LoginPage() {
  const navigate = useNavigate()
  const hasToken = useTokenStore((state) => state.accessToken !== null)

  if (hasToken) return <Navigate to="/" replace />

  return (
    <main className="flex h-full items-center justify-center bg-slate-50">
      <div className="flex w-80 flex-col items-center gap-6 rounded-lg border border-slate-200 bg-white p-8">
        <h1 className="text-lg font-semibold">docs199 로그인</h1>
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
      </div>
    </main>
  )
}
