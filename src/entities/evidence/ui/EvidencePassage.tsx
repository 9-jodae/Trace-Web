import { useEffect, useRef } from 'react'
import { splitHighlight, splitHighlights } from '../lib/highlight'
import type { EvidenceChunk } from '../model/types'

/**
 * 근거 청크와 앞뒤 문맥 청크를 일반 텍스트로 보여주고, 하이라이트 구절로 스크롤합니다.
 * 마크다운으로 렌더링하면 문자 오프셋(charStart ~ charEnd)이 어긋나므로 원문 텍스트로 그립니다.
 * `highlights`가 있으면 핵심 문장과 키워드만 표시합니다. 없으면(과거 대화 등) 서버가 준 범위를 표시합니다.
 */
export function EvidencePassage({
  evidence,
  highlights,
}: {
  evidence: Pick<
    EvidenceChunk,
    'chunkId' | 'content' | 'charStart' | 'charEnd' | 'previousChunk' | 'nextChunk'
  >
  highlights?: string[]
}) {
  const markRef = useRef<HTMLElement>(null)
  const markClass = 'rounded bg-amber-400/80 px-0.5 text-canvas'
  const { before, mark, after } = splitHighlight(
    evidence.content,
    evidence.charStart,
    evidence.charEnd,
  )
  const segments = highlights && splitHighlights(evidence.content, highlights)
  const firstMark = segments?.findIndex((segment) => segment.marked)

  useEffect(() => {
    markRef.current?.scrollIntoView?.({ block: 'center' })
  }, [evidence.chunkId, evidence.charStart, evidence.charEnd, highlights])

  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {evidence.previousChunk && (
        <p className="whitespace-pre-wrap text-ink-muted">{evidence.previousChunk}</p>
      )}
      {segments ? (
        <p className="whitespace-pre-wrap text-ink">
          {segments.map((segment, index) =>
            segment.marked ? (
              <mark
                key={index}
                ref={index === firstMark ? markRef : undefined}
                className={markClass}
              >
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </p>
      ) : (
        <p className="whitespace-pre-wrap text-ink">
          {before}
          <mark ref={markRef} className={markClass}>
            {mark}
          </mark>
          {after}
        </p>
      )}
      {evidence.nextChunk && (
        <p className="whitespace-pre-wrap text-ink-muted">{evidence.nextChunk}</p>
      )}
    </div>
  )
}
