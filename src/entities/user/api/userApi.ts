import { useQuery } from '@tanstack/react-query'
import { request, useTokenStore } from '@/shared/api'
import type { User } from '../model/types'

export const userKeys = {
  me: ['user', 'me'] as const,
}

export function fetchMe() {
  return request<User>({ method: 'GET', url: '/api/users/me' })
}

/** 로그인한 사용자 정보. 토큰이 있을 때만 조회합니다. */
export function useMe() {
  const hasToken = useTokenStore((state) => state.accessToken !== null)
  return useQuery({ queryKey: userKeys.me, queryFn: fetchMe, enabled: hasToken })
}
