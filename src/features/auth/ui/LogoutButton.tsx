import { LogOut } from 'lucide-react'
import { useLogout } from '../model/session'

export function LogoutButton() {
  const logout = useLogout()
  return (
    <button
      type="button"
      onClick={logout}
      aria-label="로그아웃"
      title="로그아웃"
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-white/10 hover:text-ink"
    >
      <LogOut className="size-4" aria-hidden />
    </button>
  )
}
