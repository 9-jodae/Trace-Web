import { Navigate, Outlet } from 'react-router'
import { useMe } from '@/entities/user'
import { toErrorMessage, useTokenStore } from '@/shared/api'

// 화면 접근 편의용입니다. 문서 접근 권한은 서버가 판단합니다.
export function AuthGuard() {
  const hasToken = useTokenStore((state) => state.accessToken !== null)
  const { isPending, error, refetch } = useMe()

  if (!hasToken) return <Navigate to="/login" replace />
  if (isPending) return <FullScreen>불러오는 중…</FullScreen>
  // 401이면 클라이언트가 토큰을 지우므로 위의 hasToken 분기에서 로그인으로 이동합니다.
  if (error) {
    return (
      <FullScreen>
        <p role="alert">{toErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-slate-300 px-3 py-1"
        >
          다시 시도
        </button>
      </FullScreen>
    )
  }
  return <Outlet />
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
      {children}
    </div>
  )
}
