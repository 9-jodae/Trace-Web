import { describe, expect, it } from 'vitest'
import { answerPathDuration, answerPathSegments, ANSWER_SEGMENT_MS } from './answerPath'

describe('answerPathSegments', () => {
  it('근거 순서대로 이웃한 노드를 잇는다', () => {
    const segments = answerPathSegments([
      { documentId: 'a', x: 0, y: 0 },
      { documentId: 'b', x: 10, y: 0 },
      { documentId: 'c', x: 10, y: 10 },
    ])
    expect(segments).toEqual([
      { key: '0', x1: 0, y1: 0, x2: 10, y2: 0, order: 0 },
      { key: '1', x1: 10, y1: 0, x2: 10, y2: 10, order: 1 },
    ])
  })

  it('노드가 하나뿐이면 선이 없다', () => {
    expect(answerPathSegments([{ documentId: 'a', x: 0, y: 0 }])).toEqual([])
  })

  it('선분 수에 맞춰 전체 시간을 정한다', () => {
    expect(answerPathDuration(2)).toBe(2 * ANSWER_SEGMENT_MS + 200)
  })
})
