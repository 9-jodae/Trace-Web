import { LogOut } from 'lucide-react'
import { useLogout } from '../model/session'

export function LogoutButton() {
  const logout = useLogout()
  return (
    <button
      type="button"
      onClick={logout}
      className="flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
    >
      <LogOut className="size-4" aria-hidden />
      로그아웃
    </button>
  )
}
