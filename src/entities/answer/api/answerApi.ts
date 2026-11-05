import { request } from '@/shared/api'
import type { AskQuestionFilters, Answer } from '../model/types'

/** 서버는 AI 처리 시간 때문에 최대 70초까지 기다리므로, 그보다 조금 길게 기다립니다. */
export const ASK_TIMEOUT_MS = 75_000

/** 질문을 보냅니다. conversationId가 없으면 새 대화를 만듭니다. SSE가 아닌 단건 응답입니다. */
export function askQuestion({
  conversationId,
  message,
  filters,
}: {
  conversationId: string | null
  message: string
  filters?: AskQuestionFilters
}) {
  return request<Answer>({
    method: 'POST',
    url: conversationId
      ? `/api/conversations/${encodeURIComponent(conversationId)}/messages`
      : '/api/conversations/messages',
    data: filters ? { message, filters } : { message },
    timeout: ASK_TIMEOUT_MS,
  })
}
