import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useFetchConversation } from '@/entities/conversation'
import { evidenceKeys, getEvidence } from '@/entities/evidence'
import { buildReconstructedMessages } from './reconstruct'
import type { ReconstructedMessage } from './types'

/** 과거 대화를 열 때: 대화 상세 + 근거 청크들을 받아와 메시지 목록으로 재구성합니다. */
export function useOpenConversation() {
  const fetchConversation = useFetchConversation()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const open = async (conversationId: string): Promise<ReconstructedMessage[]> => {
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
      const evidenceByChunkId = new Map(
        chunkIds.flatMap((chunkId, index) => {
          const result = settled[index]
          return result?.status === 'fulfilled' ? ([[chunkId, result.value]] as const) : []
        }),
      )
      return buildReconstructedMessages(detail, evidenceByChunkId)
    } finally {
      setIsLoading(false)
    }
  }

  return { open, isLoading }
}
