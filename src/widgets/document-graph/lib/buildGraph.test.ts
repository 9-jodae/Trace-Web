import { describe, expect, it } from 'vitest'
import type { Document } from '@/entities/document'
import { documentTypeColor } from '@/entities/document'
import { buildDocumentGraph, DIMMED_COLOR, typeLegend } from './buildGraph'

const doc = (
  id: string,
  documentType: string | null,
  deletedAt: string | null = null,
): Document => ({
  id,
  sourceId: 's1',
  externalId: `${id}.md`,
  title: `문서 ${id}`,
  relativePath: `${id}.md`,
  extension: 'md',
  documentType,
  author: null,
  authoredAt: null,
  clearance: 'PUBLIC',
  minimumPosition: null,
  currentVersion: 1,
  deletedAt,
  ownerDepartmentId: null,
  sourceModifiedAt: null,
})

describe('typeLegend', () => {
  it('유형을 정렬해 색을 주고, 분류 전 문서는 마지막에 회색으로 둔다', () => {
    const legend = typeLegend([
      doc('a', 'REPORT'),
      doc('b', null),
      doc('c', 'APPROVAL'),
      doc('d', 'REPORT'),
    ])
    expect(legend).toEqual([
      { type: 'APPROVAL', label: '결재', color: documentTypeColor('APPROVAL'), count: 1 },
      { type: 'REPORT', label: '보고서', color: documentTypeColor('REPORT'), count: 2 },
      { type: null, label: '분류 전', color: documentTypeColor(null), count: 1 },
    ])
  })
})

describe('buildDocumentGraph', () => {
  it('삭제되지 않은 모든 문서를 노드로 만든다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC'), doc('c', 'ETC', '2026-11-01T00:00:00Z')],
    })
    expect(graph.nodes().sort()).toEqual(['a', 'b'])
    expect(graph.getNodeAttribute('a', 'label')).toBe('문서 a')
  })

  it('근거 문서는 강조하고 나머지는 흐리게 한다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'REPORT')],
      evidenceDocumentIds: ['a'],
    })
    expect(graph.getNodeAttribute('a', 'highlighted')).toBe(true)
    expect(graph.getNodeAttribute('a', 'color')).toBe(documentTypeColor('REPORT'))
    expect(graph.getNodeAttribute('a', 'size')).toBeGreaterThan(graph.getNodeAttribute('b', 'size'))
    expect(graph.getNodeAttribute('b', 'color')).toBe(DIMMED_COLOR)
  })

  it('근거 문서가 그래프에 없으면 흐리게 하지 않는다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT')],
      evidenceDocumentIds: ['x'],
    })
    expect(graph.getNodeAttribute('a', 'color')).toBe(documentTypeColor('REPORT'))
  })

  it('양쪽 노드가 있는 연결선만 한 번씩 추가한다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
        { source: 'a', target: 'missing' },
        { source: 'a', target: 'a' },
      ],
    })
    expect(graph.size).toBe(1)
  })

  it('같은 문서 쌍에 참조·충돌이 둘 다 있으면 도착 순서와 무관하게 충돌이 이긴다', () => {
    const { graph, hasReferences, hasConflicts } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links: [
        { source: 'a', target: 'b', type: 'REFERENCES' },
        { source: 'b', target: 'a', type: 'REFERENCES' },
        { source: 'a', target: 'b', type: 'CONFLICTS' },
      ],
    })
    expect(graph.size).toBe(1)
    const edgeKey = graph.edge('a', 'b')
    expect(graph.getEdgeAttribute(edgeKey, 'type')).toBe('CONFLICTS')
    expect(hasConflicts).toBe(true)
    expect(hasReferences).toBe(false)
  })

  it('실제로 그려진 엣지 기준으로 참조·충돌 여부를 돌려준다', () => {
    const onlyReferences = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links: [{ source: 'a', target: 'b', type: 'REFERENCES' }],
    })
    expect(onlyReferences.hasReferences).toBe(true)
    expect(onlyReferences.hasConflicts).toBe(false)

    const noLinks = buildDocumentGraph({ documents: [doc('a', 'REPORT')] })
    expect(noLinks.hasReferences).toBe(false)
    expect(noLinks.hasConflicts).toBe(false)
  })

  it('근거로 커진 노드끼리 겹치면 서로 떨어뜨린다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC'), doc('c', 'APPROVAL')],
      evidenceDocumentIds: ['a', 'b'],
      // a·b를 똑같은 자리에 둬서 "근거로 커졌을 때 겹치는" 상황을 그대로 재현합니다.
      positionOverrides: new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 0, y: 0 }],
        ['c', { x: 1000, y: 1000 }],
      ]),
    })
    const a = graph.getNodeAttributes('a')
    const b = graph.getNodeAttributes('b')
    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    const minDistance = (a.size + b.size) / 2
    expect(distance).toBeGreaterThanOrEqual(minDistance)
    // 근거가 아닌 노드는 건드리지 않는다.
    expect(graph.getNodeAttributes('c')).toMatchObject({ x: 1000, y: 1000 })
  })

  it('위치를 넘기면 계산된 배치 대신 그 위치를 그대로 쓴다(끌어서 옮긴 자리 유지)', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      positionOverrides: new Map([['a', { x: 999, y: -999 }]]),
    })
    expect(graph.getNodeAttribute('a', 'x')).toBe(999)
    expect(graph.getNodeAttribute('a', 'y')).toBe(-999)
    // 넘기지 않은 문서(b)는 평소처럼 계산된 배치를 받는다.
    expect(graph.getNodeAttribute('b', 'x')).not.toBe(999)
  })

  it('같은 유형끼리 뭉치지 않도록 유형을 돌아가며 섞어 배치한다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a1', 'A'), doc('a2', 'A'), doc('b1', 'B')],
    })
    const at = (id: string) => graph.getNodeAttributes(id)
    const distance = (p: string, q: string) => Math.hypot(at(p).x - at(q).x, at(p).y - at(q).y)
    // a1(1번째) 다음은 b1(2번째)이 와야 하므로, 다른 유형인 b1이 같은 유형 a2(3번째)보다 a1에 더 가깝다.
    expect(distance('a1', 'b1')).toBeLessThan(distance('a1', 'a2'))
  })
})
