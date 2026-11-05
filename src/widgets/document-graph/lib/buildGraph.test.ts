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

  it('같은 유형의 노드는 다른 유형보다 가깝게 배치한다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a1', 'A'), doc('a2', 'A'), doc('b1', 'B')],
    })
    const at = (id: string) => graph.getNodeAttributes(id)
    const distance = (p: string, q: string) => Math.hypot(at(p).x - at(q).x, at(p).y - at(q).y)
    expect(distance('a1', 'a2')).toBeLessThan(distance('a1', 'b1'))
  })
})
