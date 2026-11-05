import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface TokenState {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

export const TOKEN_STORAGE_KEY = 'docs199.auth'

// 새로고침해도 로그인이 유지되도록 세션 스토리지에 보관합니다(팀 결정, 2026-11-05).
// 탭을 닫으면 지워집니다. 서버 토큰은 1시간 후 만료되며 갱신 토큰은 아직 없습니다.
export const useTokenStore = create<TokenState>()(
  persist(
    (set) => ({
      accessToken: null,
      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: TOKEN_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ accessToken: state.accessToken }),
    },
  ),
)
