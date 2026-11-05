import { useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/shared/api'
import type { ConversationDetail, ConversationSummary } from '../model/types'

export const conversationKeys = {
  all: ['conversation', 'list'] as const,
  detail: (id: string) => ['conversation', 'detail', id] as const,
}

export function listConversations() {
  return request<ConversationSummary[]>({ method: 'GET', url: '/api/conversations' })
}

export function getConversation(id: string) {
  return request<ConversationDetail>({
    method: 'GET',
    url: `/api/conversations/${encodeURIComponent(id)}`,
  })
}

export function deleteConversation(id: string) {
  return request<{ deleted: boolean }>({
    method: 'DELETE',
    url: `/api/conversations/${encodeURIComponent(id)}`,
  })
}

export function useConversations() {
  return useQuery({ queryKey: conversationKeys.all, queryFn: listConversations })
}

/** 반응형 구독이 아니라 클릭 시 한 번 가져오면 되는 상세 조회라 queryClient로 직접 가져옵니다. */
export function useFetchConversation() {
  const queryClient = useQueryClient()
  return (id: string) =>
    queryClient.fetchQuery({
      queryKey: conversationKeys.detail(id),
      queryFn: () => getConversation(id),
    })
}
