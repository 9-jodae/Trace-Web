import { Navigate, Outlet } from 'react-router'
import { useMe, type Role } from '@/entities/user'

const ADMIN_ROLES: readonly Role[] = ['DOC_ADMIN', 'SYSTEM_ADMIN']

/**
 * 관리 화면 접근 편의용입니다. 실제 권한은 서버가 판단하며, 서버가 403을 주면 화면이 따로 알립니다.
 * AuthGuard 아래에 두므로 사용자 정보는 이미 불러온 상태입니다.
 */
export function AdminGuard() {
  const { data: me } = useMe()
  if (!me || !ADMIN_ROLES.includes(me.role)) return <Navigate to="/" replace />
  return <Outlet />
}
