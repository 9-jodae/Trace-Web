import { describe, expect, it } from 'vitest'
import type { AnswerEvidence, AnswerSource } from '@/entities/answer'
import { buildEvidenceCards, sectionOf } from './evidenceCards'

const source = (id: string, documentId: string, text = '본문'): AnswerSource => ({
  id,
  text,
  source: 'local',
  documentId,
  documentTitle: `문서 ${documentId}`,
  versionId: 'v1',
  charStart: null,
  charEnd: null,
})

const evidence = (chunkId: string, documentId: string, quote: string): AnswerEvidence => ({
  chunkId,
  source: `문서 ${documentId}`,
  documentId,
  versionId: 'v1',
  quote,
  charStart: null,
  charEnd: null,
})

describe('sectionOf', () => {
  it('Markdown 제목이나 제N조로 시작하는 첫 줄을 조항으로 본다', () => {
    expect(sectionOf('## 제4조 숙박비\n\n본문', '출장비 규정')).toBe('제4조 숙박비')
    expect(sectionOf('제3조 사전 결재\n본문', '경비 결재 절차')).toBe('제3조 사전 결재')
  })

  it('일반 문장이거나 문서 제목과 같은 제목이면 보여주지 않는다', () => {
    expect(sectionOf('숙박비는 1박당 90,000원이다.', '출장비 규정')).toBeNull()
    expect(sectionOf('# 출장비 규정\n본문', '출장비 규정')).toBeNull()
  })
})

describe('buildEvidenceCards', () => {
  it('인용을 같은 청크, 없으면 같은 문서의 첫 근거 카드에 붙인다', () => {
    const cards = buildEvidenceCards(
      [source('c1', 'd1', '## 제4조 숙박비\n본문'), source('c2', 'd1'), source('c3', 'd2')],
      [evidence('c2', 'd1', '같은 청크 인용'), evidence('c9', 'd1', '같은 문서 다른 청크 인용')],
    )
    expect(cards.map((card) => [card.source.id, card.section, card.quotes])).toEqual([
      ['c1', '제4조 숙박비', ['같은 문서 다른 청크 인용']],
      ['c2', null, ['같은 청크 인용']],
      ['c3', null, []],
    ])
  })

  it('근거 목록에 없는 문서의 인용은 그 인용으로 카드를 추가하고 같은 인용은 한 번만 보여준다', () => {
    const cards = buildEvidenceCards(
      [source('c1', 'd1')],
      [
        evidence('x1', 'd2', '다른 문서 인용'),
        evidence('c1', 'd1', 'A'),
        evidence('c1', 'd1', 'A'),
      ],
    )
    expect(cards.map((card) => [card.source.id, card.source.documentTitle, card.quotes])).toEqual([
      ['c1', '문서 d1', ['A']],
      ['x1', '문서 d2', ['다른 문서 인용']],
    ])
  })
})
