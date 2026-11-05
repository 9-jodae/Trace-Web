import { useCallback, useEffect, useMemo, useRef } from 'react'
import { findTextRanges } from '@/entities/evidence'

/** `index.css`의 `::highlight(evidence-quote)`와 이름을 맞춥니다. */
const HIGHLIGHT_NAME = 'evidence-quote'

/** 열려 있는 뷰어마다 찾은 위치. CSS 하이라이트는 이름 하나에 모두 모아 등록합니다. */
const rangesByOwner = new Map<object, Range[]>()

function syncHighlight() {
  // CSS Custom Highlight API를 지원하지 않는 브라우저(와 jsdom)에서는 표시만 생략합니다.
  if (typeof CSS === 'undefined' || !('highlights' in CSS) || typeof Highlight === 'undefined') {
    return
  }
  const ranges = [...rangesByOwner.values()].flat()
  if (ranges.length === 0) CSS.highlights.delete(HIGHLIGHT_NAME)
  else CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges))
}

/**
 * 원문 영역(rootRef)에서 인용 문구를 찾아 칠하고, 처음 찾았을 때 그 위치로 스크롤합니다.
 * DOM을 고치지 않고 CSS 하이라이트로 칠하므로 react-markdown·pdf.js가 그린 요소와 충돌하지 않습니다.
 * 원문을 다 그린 뒤(Markdown) 또는 페이지 텍스트 레이어를 그릴 때마다(PDF) `apply`를 다시 부릅니다.
 * 아직 그리는 중이라 레이아웃이 바뀔 수 있으면 `apply(false)`로 칠하기만 하고 스크롤은 미룹니다.
 */
export function useQuoteHighlight<T extends HTMLElement>(quotes: string[]) {
  const rootRef = useRef<T>(null)
  const ownerRef = useRef({})
  const scrolledRef = useRef(false)
  // 렌더마다 새 배열이 와도 문구가 같으면 다시 찾지 않습니다.
  const key = quotes.join('\u0000')
  const stableQuotes = useMemo(() => (key ? key.split('\u0000') : []), [key])

  const apply = useCallback(
    (allowScroll = true) => {
      const root = rootRef.current
      if (!root) return
      const ranges = findTextRanges(root, stableQuotes)
      rangesByOwner.set(ownerRef.current, ranges)
      syncHighlight()

      const first = ranges[0]
      if (allowScroll && first && !scrolledRef.current) {
        scrolledRef.current = true
        first.startContainer.parentElement?.scrollIntoView?.({ block: 'center' })
      }
    },
    [stableQuotes],
  )

  useEffect(() => {
    const owner = ownerRef.current
    scrolledRef.current = false
    apply()
    return () => {
      rangesByOwner.delete(owner)
      syncHighlight()
    }
  }, [apply])

  return { rootRef, apply }
}
