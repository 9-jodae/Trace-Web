import { useEffect, useRef } from 'react'
import { splitHighlight } from '../lib/highlight'
import type { EvidenceChunk } from '../model/types'

/**
 * 근거 청크와 앞뒤 문맥 청크를 일반 텍스트로 보여주고, 하이라이트 구절로 스크롤합니다.
 * 마크다운으로 렌더링하면 문자 오프셋(charStart ~ charEnd)이 어긋나므로 원문 텍스트로 그립니다.
 */
export function EvidencePassage({
  evidence,
}: {
  evidence: Pick<
    EvidenceChunk,
    'chunkId' | 'content' | 'charStart' | 'charEnd' | 'previousChunk' | 'nextChunk'
  >
}) {
  const markRef = useRef<HTMLElement>(null)
  const { before, mark, after } = splitHighlight(
    evidence.content,
    evidence.charStart,
    evidence.charEnd,
  )

  useEffect(() => {
    markRef.current?.scrollIntoView?.({ block: 'center' })
  }, [evidence.chunkId, evidence.charStart, evidence.charEnd])

  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {evidence.previousChunk && (
        <p className="whitespace-pre-wrap text-ink-muted">{evidence.previousChunk}</p>
      )}
      <p className="whitespace-pre-wrap text-ink">
        {before}
        <mark ref={markRef} className="rounded bg-amber-400/80 px-0.5 text-canvas">
          {mark}
        </mark>
        {after}
      </p>
      {evidence.nextChunk && (
        <p className="whitespace-pre-wrap text-ink-muted">{evidence.nextChunk}</p>
      )}
    </div>
  )
}
