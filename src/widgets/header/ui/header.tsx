import { Link } from 'react-router-dom'
import { useSession } from '@/entities/user'

export function Header() {
  const user = useSession((s) => s.user)
  return (
    <header style={{ display: 'flex', gap: 12 }}>
      <Link to="/">검색</Link>
      <Link to="/graph">문서 그래프</Link>
      <Link to="/alerts">알림</Link>
      {user?.role === 'admin' && <Link to="/admin/documents">관리</Link>}
    </header>
  )
}
