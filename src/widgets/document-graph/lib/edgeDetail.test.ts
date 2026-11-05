import { describe, expect, it } from 'vitest'
import type { GraphEdge } from '@/entities/graph'
import { describeEdge, focusConflictDocuments } from './edgeDetail'

const edge = (values: Partial<GraphEdge>): GraphEdge => ({
  id: 'e',
  source: 'a',
  target: 'b',
  type: 'REFERENCES',
  label: '참조',
  detail: null,
  ...values,
})

const titleOf = (id: string) => `문서 ${id}`

describe('describeEdge', () => {
  it('충돌은 문서별 값을 보여 주고 맨 앞에 둔다', () => {
    const items = describeEdge({
      source: 'b',
      target: 'a',
      titleOf,
      edges: [
        edge({}),
        edge({
          type: 'CONFLICTS',
          detail: { item: '이월 일수', thisValue: '5일', otherValue: '7일' },
        }),
        edge({ source: 'a', target: 'c', type: 'CONFLICTS' }),
      ],
    })
    expect(items[0]).toEqual({
      kind: 'CONFLICT',
      item: '이월 일수',
      values: [
        { title: '문서 a', value: '5일' },
        { title: '문서 b', value: '7일' },
      ],
    })
    expect(items).toHaveLength(2)
  })

  it('참조받는 문서가 수정되면 어느 문서를 확인할지 알려 준다', () => {
    const items = describeEdge({
      source: 'a',
      target: 'b',
      titleOf,
      edges: [edge({})],
      modifiedDocuments: [{ id: 'b', title: '문서 b' }],
    })
    expect(items[0]).toEqual({
      kind: 'MODIFIED',
      modifiedTitle: '문서 b',
      referrerTitle: '문서 a',
    })
  })

  it('참조하는 쪽이 수정된 경우와 해소한 충돌은 경고하지 않는다', () => {
    const items = describeEdge({
      source: 'a',
      target: 'b',
      titleOf,
      edges: [
        edge({}),
        edge({
          type: 'CONFLICTS',
          detail: { item: '이월', thisValue: '5일', otherValue: '7일' },
        }),
      ],
      modifiedDocuments: [{ id: 'a', title: '문서 a' }],
      resolvedPairs: [['b', 'a']],
    })
    expect(items.map((item) => item.kind)).toEqual(['REFERENCE'])
  })

  it('해소한 쌍이 아닌 다른 충돌은 그대로 보여 준다', () => {
    const conflict = edge({
      type: 'CONFLICTS',
      detail: { item: '이월', thisValue: '5일', otherValue: '7일' },
    })
    const items = describeEdge({
      source: 'a',
      target: 'b',
      titleOf,
      edges: [conflict],
      resolvedPairs: [['b', 'c']],
    })
    expect(items.map((item) => item.kind)).toEqual(['CONFLICT'])
  })

  it('보안 위험은 표시하고 CONTENT_CHECK는 조건 수정 전까지 표시하지 않는다', () => {
    const items = describeEdge({
      source: 'a',
      target: 'b',
      titleOf,
      edges: [
        edge({ warnings: [{ type: 'SECURITY_RISK' }] }),
        edge({
          source: 'b',
          target: 'a',
          warnings: [{ type: 'CONTENT_CHECK', modifiedDocumentId: 'a' }],
        }),
      ],
    })
    expect(items[0]).toEqual({ kind: 'SECURITY', fromTitle: '문서 a', toTitle: '문서 b' })
    expect(items.filter((item) => item.kind === 'MODIFIED')).toEqual([])
    expect(items.filter((item) => item.kind === 'SECURITY')).toHaveLength(1)
  })

  it('주제를 보여 준다', () => {
    const items = describeEdge({
      source: 'a',
      target: 'b',
      titleOf,
      edges: [edge({ type: 'TOPIC', label: '보안', detail: { topics: ['보안', '인사'] } })],
    })
    expect(items).toEqual([{ kind: 'TOPIC', topics: ['보안', '인사'] }])
  })
})

describe('focusConflictDocuments', () => {
  const conflict = edge({ type: 'CONFLICTS' })

  it('인용 문서에 충돌 쌍이 있으면 그 두 문서만 남긴다', () => {
    expect(focusConflictDocuments(['c', 'b', 'a'], [conflict])).toEqual(['b', 'a'])
  })

  it('한쪽만 인용해도 상대 문서를 함께 강조하고 인용 순서를 앞에 둔다', () => {
    expect(focusConflictDocuments(['a', 'c'], [conflict])).toEqual(['a', 'b'])
    expect(focusConflictDocuments(['b'], [conflict])).toEqual(['b', 'a'])
  })

  it('충돌이 없거나 해소했으면 인용 문서를 그대로 둔다', () => {
    expect(focusConflictDocuments(['a', 'b'], [edge({})])).toEqual(['a', 'b'])
    expect(focusConflictDocuments(['a', 'c'], [conflict], [['a', 'b']])).toEqual(['a', 'c'])
  })
})
