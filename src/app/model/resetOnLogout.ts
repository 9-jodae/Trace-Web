import { resetChatStore } from '@/features/ask-question'
import { resetTabStore } from '@/features/document-tabs'
import { useTokenStore } from '@/shared/api'

/** 토큰이 사라지면(로그아웃, 만료) 이전 사용자의 화면 상태를 지웁니다. */
export function resetOnLogout() {
  return useTokenStore.subscribe((state, previous) => {
    if (previous.accessToken !== null && state.accessToken === null) {
      resetChatStore()
      resetTabStore()
    }
  })
}
