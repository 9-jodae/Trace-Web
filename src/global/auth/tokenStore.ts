import { create } from 'zustand'

interface TokenState {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

// 토큰 보관 방식(새로고침 후 유지 여부, 갱신 토큰)은 서버 정책이 정해진 뒤 결정합니다.
// 그때까지는 메모리에만 보관합니다.
export const useTokenStore = create<TokenState>()((set) => ({
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
}))
