import { describe, expect, it } from 'vitest'
import type { ConversationDetail } from '@/entities/conversation'
import type { EvidenceChunk } from '@/entities/evidence'
import { buildReconstructedMessages } from './reconstruct'

const chunk = (chunkId: string, documentId: string): EvidenceChunk => ({
  chunkId,
  documentId,
  documentTitle: `문서 ${documentId}`,
  extension: 'md',
  versionId: 'v1',
  versionNumber: 1,
  content: '청크 본문',
  charStart: 0,
  charEnd: 4,
  page: null,
  previousChunk: null,
  nextChunk: null,
  downloadUrl: 'https://example.com/signed',
})

const detail = (): ConversationDetail => ({
  conversation: {
    id: 'c1',
    userId: 'u1',
    title: '연차 이월',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  messages: [
    {
      id: 'm1',
      conversationId: 'c1',
      role: 'USER',
      content: '연차 이월은?',
      evidenceChunkIds: [],
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'm2',
      conversationId: 'c1',
      role: 'ASSISTANT',
      content: '최대 5일까지 이월할 수 있습니다.',
      evidenceChunkIds: ['k1', 'k2'],
      createdAt: '2026-01-01T00:00:10Z',
    },
  ],
})

describe('buildReconstructedMessages', () => {
  it('USER는 질문으로, ASSISTANT는 답변 + 근거로 바꾼다', () => {
    const evidenceByChunkId = new Map([
      ['k1', chunk('k1', 'd1')],
      ['k2', chunk('k2', 'd2')],
    ])

    const messages = buildReconstructedMessages(detail(), evidenceByChunkId)

    expect(messages).toEqual([
      { id: 'm1', kind: 'question', text: '연차 이월은?' },
      {
        id: 'm2',
        kind: 'answer',
        text: '최대 5일까지 이월할 수 있습니다.',
        sources: [
          {
            id: 'k1',
            text: '청크 본문',
            source: '',
            documentId: 'd1',
            documentTitle: '문서 d1',
            versionId: 'v1',
            charStart: 0,
            charEnd: 4,
          },
          {
            id: 'k2',
            text: '청크 본문',
            source: '',
            documentId: 'd2',
            documentTitle: '문서 d2',
            versionId: 'v1',
            charStart: 0,
            charEnd: 4,
          },
        ],
      },
    ])
  })

  it('청크 조회가 실패한 근거는 조용히 뺀다', () => {
    const evidenceByChunkId = new Map([['k1', chunk('k1', 'd1')]]) // k2는 조회 실패(삭제·권한 없음 등)

    const messages = buildReconstructedMessages(detail(), evidenceByChunkId)

    expect(messages[1]).toMatchObject({ kind: 'answer', sources: [{ id: 'k1' }] })
  })
})
