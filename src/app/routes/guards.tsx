import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/entities/user'

// 프론트 가드는 화면 접근 제어용일 뿐, 문서 권한 필터링은 반드시 서버에서 처리
export function AuthGuard() {
  const user = useSession((s) => s.user)
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export function AdminGuard() {
  const user = useSession((s) => s.user)
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />
}
