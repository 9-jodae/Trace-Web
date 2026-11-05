import { Navigate, useNavigate } from 'react-router'
import { LoginForm } from '@/features/auth'
import { useTokenStore } from '@/shared/api'
import background from './assets/background.svg'
import logo from './assets/logo.svg'

export function LoginPage() {
  const navigate = useNavigate()
  const hasToken = useTokenStore((state) => state.accessToken !== null)

  if (hasToken) return <Navigate to="/" replace />

  return (
    <main className="relative flex h-full items-center justify-center overflow-hidden bg-canvas px-4">
      <img
        src={background}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="relative flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[22px] border border-white/10 bg-[#161514] px-9 pt-9 pb-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 px-1 py-0.5">
          <img src={logo} alt="" className="size-9" />
          <p className="text-[17px] font-semibold tracking-tight text-ink">문서119</p>
        </div>
        <h1 className="text-xl font-semibold text-ink">사내 문서 근거 검색</h1>
        <p className="text-sm text-ink-dim">회사 계정으로 로그인하세요</p>
        <LoginForm onSuccess={() => navigate('/', { replace: true })} />
        <p className="text-xs text-ink-muted">계정이 없으면 시스템 관리자에게 문의하세요</p>
      </div>
    </main>
  )
}
