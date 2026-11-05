import type { AnswerEvidence, AnswerSource } from '@/entities/answer'

/** 답변 아래에 보여줄 근거 카드 하나. 근거 문서와 그 문서에서 뽑은 인용을 한데 묶습니다. */
export interface EvidenceCard {
  source: AnswerSource
  /** 카드 오른쪽 위에 보여줄 조항·소제목. 청크 첫 줄에서 알 수 있을 때만 있습니다. */
  section: string | null
  /** 이 근거에서 그대로 발췌한 인용 문장 */
  quotes: string[]
}

const SECTION_MAX_LENGTH = 24

/**
 * 청크 첫 줄이 Markdown 제목이거나 "제N조"로 시작하면 조항·소제목으로 봅니다.
 * 문서 제목과 같으면(문서 첫 청크) 굳이 다시 보여주지 않습니다.
 */
export function sectionOf(text: string, documentTitle: string): string | null {
  const firstLine = text.split('\n').find((line) => line.trim() !== '')
  if (!firstLine) return null
  const isHeading = /^\s*#{1,6}\s+/.test(firstLine)
  const heading = firstLine.replace(/^\s*#{1,6}\s+/, '').trim()
  if (!isHeading && !/^제\s*\d+\s*조/.test(heading)) return null
  if (!heading || heading === documentTitle.trim() || heading.length > SECTION_MAX_LENGTH) {
    return null
  }
  return heading
}

/**
 * 근거 문서 목록과 핵심 인용을 카드로 합칩니다.
 * - 인용은 같은 청크의 근거에 붙이고, 없으면 같은 문서의 첫 근거에 붙입니다.
 * - 근거 목록에 없는 문서의 인용은 그 인용만으로 카드를 하나 더 만듭니다.
 */
export function buildEvidenceCards(
  sources: AnswerSource[],
  evidence: AnswerEvidence[],
): EvidenceCard[] {
  const cards: EvidenceCard[] = sources.map((source) => ({
    source,
    section: sectionOf(source.text, source.documentTitle),
    quotes: [],
  }))

  for (const item of evidence) {
    const card =
      cards.find((candidate) => candidate.source.id === item.chunkId) ??
      cards.find((candidate) => candidate.source.documentId === item.documentId)
    if (card) {
      if (!card.quotes.includes(item.quote)) card.quotes.push(item.quote)
      continue
    }
    cards.push({
      source: {
        id: item.chunkId,
        text: item.quote,
        source: item.source,
        documentId: item.documentId,
        documentTitle: item.source,
        versionId: item.versionId,
        charStart: item.charStart,
        charEnd: item.charEnd,
      },
      section: null,
      quotes: [item.quote],
    })
  }
  return cards
}
