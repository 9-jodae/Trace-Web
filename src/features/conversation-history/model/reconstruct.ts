import type { AnswerSource } from '@/entities/answer'
import type { ConversationDetail } from '@/entities/conversation'
import type { EvidenceChunk } from '@/entities/evidence'
import type { ReconstructedMessage } from './types'

/**
 * 청크 조회 API에는 질문 응답의 AnswerSource에 있는 `source`(소스 이름) 필드가 없습니다.
 * 지금 화면에서 그 값을 쓰는 곳이 없어 빈 문자열로 둡니다.
 */
function toAnswerSource(chunkId: string, chunk: EvidenceChunk): AnswerSource {
  return {
    id: chunkId,
    text: chunk.content,
    source: '',
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    versionId: chunk.versionId,
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
  }
}

/** 접근할 수 없거나 삭제된 문서의 청크는 조회가 404로 빠지므로, evidenceByChunkId에 없으면 조용히 뺍니다. */
export function buildReconstructedMessages(
  detail: ConversationDetail,
  evidenceByChunkId: Map<string, EvidenceChunk>,
): ReconstructedMessage[] {
  return detail.messages.map((message) => {
    if (message.role === 'USER') {
      return {
        id: message.id,
        kind: 'question',
        text: message.content,
        createdAt: message.createdAt,
      }
    }
    const sources = message.evidenceChunkIds.flatMap((chunkId) => {
      const chunk = evidenceByChunkId.get(chunkId)
      return chunk ? [toAnswerSource(chunkId, chunk)] : []
    })
    // 대화 상세 API는 그때 뽑혔던 핵심 인용(evidence)까지는 저장하지 않아 다시 보여줄 수 없습니다.
    const missingSourceCount = message.evidenceChunkIds.length - sources.length
    return {
      id: message.id,
      kind: 'answer',
      text: message.content,
      createdAt: message.createdAt,
      sources,
      evidence: [],
      ...(missingSourceCount > 0 && { missingSourceCount }),
    }
  })
}
