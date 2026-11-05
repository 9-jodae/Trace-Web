import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTokenStore } from '@/shared/api'
import { login, type LoginRequest } from '../api/authApi'

/** 로그인에 성공하면 이전 사용자의 캐시를 지우고 토큰을 저장합니다. */
export function useLogin() {
  const queryClient = useQueryClient()
  const setAccessToken = useTokenStore((state) => state.setAccessToken)

  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: ({ accessToken }) => {
      queryClient.clear()
      setAccessToken(accessToken)
    },
  })
}

/** 서버에 로그아웃 API가 없으므로 클라이언트의 토큰과 캐시만 지웁니다. */
export function useLogout() {
  const queryClient = useQueryClient()
  const setAccessToken = useTokenStore((state) => state.setAccessToken)

  return () => {
    setAccessToken(null)
    queryClient.clear()
  }
}
