import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { locateEvidence, type EvidencePhrases } from '@/entities/evidence'

/** `::highlight()` 이름. 스타일은 `app/styles/index.css`에 있습니다. */
export type EvidenceHighlightName = 'evidence-text' | 'evidence-pdf'

/**
 * - `found`: 인용·키워드를 원문 안에 칠함
 * - `located`: 칠할 문구는 없지만 근거 청크 위치는 찾아 그곳으로 이동함
 * - `missing`: 원문에서 근거를 찾지 못함
 */
export type EvidenceHighlightStatus = 'idle' | 'found' | 'located' | 'missing'

const NO_PHRASES: EvidencePhrases = { quotes: [], keywords: [] }

/**
 * CSS Custom Highlight API로 범위를 칠합니다. 원문 DOM을 바꾸지 않아 react-markdown·pdf.js가 그린
 * 노드와 충돌하지 않습니다. 이 API가 없는 브라우저에서는 칠하지 않고 위치 이동만 합니다.
 */
function paint(name: EvidenceHighlightName, ranges: Range[]): () => void {
  if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') {
    return () => {}
  }
  let highlight = CSS.highlights.get(name)
  if (!highlight) {
    highlight = new Highlight()
    CSS.highlights.set(name, highlight)
  }
  const target = highlight
  for (const range of ranges) target.add(range)
  return () => {
    for (const range of ranges) target.delete(range)
  }
}

function scrollToRange(range: Range) {
  const element =
    range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement
  element?.scrollIntoView?.({ block: 'center' })
}

/** 누른 근거 청크 안의 칠한 곳을 먼저, 없으면 청크 위치, 그것도 없으면 처음 칠한 곳으로 이동합니다. */
function scrollTarget(highlights: Range[], chunk: Range | null): Range | undefined {
  if (chunk) {
    const inside = highlights.find(
      (range) =>
        chunk.compareBoundaryPoints(Range.START_TO_START, range) <= 0 &&
        chunk.compareBoundaryPoints(Range.END_TO_END, range) >= 0,
    )
    return inside ?? chunk
  }
  return highlights[0]
}

/**
 * 원문 영역(`rootRef`)에서 근거를 찾아 칠하고, 근거가 바뀌면 처음 찾았을 때 한 번만 그 위치로 스크롤합니다.
 * 원문은 비동기로 그려지므로(Markdown 파일 읽기, PDF 페이지별 텍스트 레이어) 그릴 때마다 `renderVersion`을
 * 올려 다시 찾습니다.
 */
export function useEvidenceHighlight({
  rootRef,
  name,
  focusKey,
  chunkText,
  phrases,
  renderVersion,
}: {
  rootRef: RefObject<HTMLElement | null>
  name: EvidenceHighlightName
  /** 근거가 바뀌었는지 판단하는 값(청크 ID). 없으면 칠하지 않습니다. */
  focusKey: string | undefined
  chunkText: string | undefined
  phrases: EvidencePhrases | undefined
  renderVersion: number
}) {
  const [result, setResult] = useState<{
    key: string
    status: EvidenceHighlightStatus
    target: Range | undefined
  } | null>(null)
  const scrolledKey = useRef<string | null>(null)
  const phraseKey = JSON.stringify(phrases ?? NO_PHRASES)
  const currentKey = `${focusKey}:${phraseKey}`

  useEffect(() => {
    const root = rootRef.current
    if (!root || !focusKey || chunkText === undefined) return
    const { highlights, chunk } = locateEvidence(root, {
      chunkText,
      phrases: JSON.parse(phraseKey) as EvidencePhrases,
    })
    const target = scrollTarget(highlights, chunk)
    const status = highlights.length > 0 ? 'found' : chunk ? 'located' : 'missing'
    setResult({ key: currentKey, status, target })
    if (target && scrolledKey.current !== currentKey) {
      scrolledKey.current = currentKey
      scrollToRange(target)
    }
    return paint(name, highlights)
  }, [rootRef, name, focusKey, chunkText, phraseKey, currentKey, renderVersion])

  const current = result?.key === currentKey ? result : null
  const status: EvidenceHighlightStatus = !focusKey || !current ? 'idle' : current.status
  const target = current?.target

  const scrollToEvidence = useCallback(() => {
    if (target) scrollToRange(target)
  }, [target])

  return { status, scrollToEvidence }
}
