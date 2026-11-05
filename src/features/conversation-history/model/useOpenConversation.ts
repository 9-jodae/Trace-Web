import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useFetchConversation } from '@/entities/conversation'
import { evidenceKeys, getEvidence } from '@/entities/evidence'
import { ApiRequestError } from '@/shared/api'
import { buildReconstructedMessages } from './reconstruct'
import type { ReconstructedMessage } from './types'

/**
 * 가장 최근에 시작한 "대화 열기" 번호. 사이드바와 채팅 패널이 각자 이 훅을 쓰므로 화면 전체에서
 * 하나로 셉니다. 늦게 끝난 이전 요청이 나중에 고른 대화를 덮어쓰지 않게 합니다.
 */
let latestOpenId = 0

/** 문서 삭제·개정·권한 변경으로 더는 볼 수 없는 근거. 이런 근거만 조용히 빼고, 다른 오류는 열기 실패로 봅니다. */
function isUnavailable(reason: unknown) {
  return reason instanceof ApiRequestError && (reason.status === 404 || reason.code === 'NOT_FOUND')
}

/**
 * 과거 대화를 열 때: 대화 상세 + 근거 청크들을 받아와 메시지 목록으로 재구성합니다.
 * 그사이 다른 대화 열기가 시작되었으면 null을 돌려주므로, 호출한 쪽은 결과를 버립니다.
 */
export function useOpenConversation() {
  const fetchConversation = useFetchConversation()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const open = async (conversationId: string): Promise<ReconstructedMessage[] | null> => {
    const openId = ++latestOpenId
    setIsLoading(true)
    try {
      const detail = await fetchConversation(conversationId)
      const chunkIds = [...new Set(detail.messages.flatMap((message) => message.evidenceChunkIds))]
      const settled = await Promise.allSettled(
        chunkIds.map((chunkId) =>
          queryClient.fetchQuery({
            queryKey: evidenceKeys.chunk(chunkId),
            queryFn: () => getEvidence(chunkId),
          }),
        ),
      )
      // 일시적인 오류(연결 끊김, 시간 초과, 5xx)로 근거를 빼면 다시 열어도 복구되지 않으므로 실패로 알립니다.
      const transient = settled.find(
        (result) => result.status === 'rejected' && !isUnavailable(result.reason),
      )
      if (transient?.status === 'rejected') throw transient.reason
      if (openId !== latestOpenId) return null

      const evidenceByChunkId = new Map(
        chunkIds.flatMap((chunkId, index) => {
          const result = settled[index]
          return result?.status === 'fulfilled' ? ([[chunkId, result.value]] as const) : []
        }),
      )
      return buildReconstructedMessages(detail, evidenceByChunkId)
    } catch (error) {
      // 이미 다른 대화를 열기 시작했다면 이전 요청의 실패는 화면에 알리지 않습니다.
      if (openId !== latestOpenId) return null
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return { open, isLoading }
}
