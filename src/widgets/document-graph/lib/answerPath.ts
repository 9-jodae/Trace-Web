/** 답변 근거 노드를 근거 순서대로 잇는 화면 좌표 선분. 같은 문서가 두 번 나오면 처음 자리만 씁니다. */
export function answerPathSegments(points: { documentId: string; x: number; y: number }[]) {
  const seen = new Set<string>()
  const ordered = points.filter(
    (point) => !seen.has(point.documentId) && seen.add(point.documentId),
  )
  return ordered.slice(1).map((point, index) => {
    const from = ordered[index] as { x: number; y: number }
    return { key: `${index}`, x1: from.x, y1: from.y, x2: point.x, y2: point.y, order: index }
  })
}

/** 선분 하나를 그리는 시간(ms). 다음 선분은 앞 선분이 끝난 뒤 시작합니다. */
export const ANSWER_SEGMENT_MS = 250

export function answerPathDuration(segmentCount: number) {
  return segmentCount * ANSWER_SEGMENT_MS + 200
}
