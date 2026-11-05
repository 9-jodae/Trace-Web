import Graph from 'graphology'
import { describe, expect, it } from 'vitest'
import type { Document } from '@/entities/document'
import { documentTypeColor } from '@/entities/document'
import {
  avoidEdgeNodeCrossings,
  buildDocumentGraph,
  DIMMED_COLOR,
  separateEvidenceNodes,
  typeLegend,
  type NodeAttributes,
} from './buildGraph'

/** avoidEdgeNodeCrossings·separateEvidenceNodes를 직접 테스트하기 위한 최소 그래프. */
function node(id: string, x: number, y: number, size = 6): [string, NodeAttributes] {
  return [
    id,
    {
      x,
      y,
      size,
      color: '#fff',
      label: id,
      highlighted: false,
      documentType: null,
      extension: 'md',
      authoredAt: null,
    },
  ]
}

function makeGraph(...nodes: [string, NodeAttributes][]) {
  const graph = new Graph<NodeAttributes>({ type: 'undirected', multi: false })
  for (const [id, attributes] of nodes) graph.addNode(id, attributes)
  return graph
}

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

  it('서로 참조하는 문서의 글자는 한 번만 쓰고 공통 주제를 참조 앞에 붙인다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links: [
        { source: 'a', target: 'b', type: 'REFERENCES', label: '참조' },
        { source: 'b', target: 'a', type: 'REFERENCES', label: '참조' },
        { source: 'a', target: 'b', type: 'TOPIC', label: '보안' },
      ],
    })
    expect(graph.getEdgeAttribute(graph.edge('a', 'b'), 'label')).toBe('보안 참조')
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

  it('드래그로 옮긴 노드는 연결선 위에 있어도 자리를 유지한다', () => {
    // c를 a-b 연결선의 정중앙에 일부러 끌어다 놓은 상황입니다. positionOverrides로 넘긴
    // 노드는 보정 대상에서 빠지므로, 교차 보정이 있어도 사용자가 둔 자리 그대로여야 합니다.
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC'), doc('c', 'APPROVAL')],
      links: [{ source: 'a', target: 'b', type: 'REFERENCES' }],
      positionOverrides: new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 100, y: 0 }],
        ['c', { x: 50, y: 0 }],
      ]),
    })
    expect(graph.getNodeAttributes('c')).toMatchObject({ x: 50, y: 0 })
  })

  it('드래그한 근거 노드끼리 겹치게 둬도 자리를 유지한다', () => {
    // a·b를 일부러 같은 자리로 끌어다 놓은 상황입니다. 둘 다 positionOverrides로 넘겼으므로
    // 근거 노드 분리 보정이 있어도 겹친 그대로여야 합니다.
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      evidenceDocumentIds: ['a', 'b'],
      positionOverrides: new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 0, y: 0 }],
      ]),
    })
    expect(graph.getNodeAttributes('a')).toMatchObject({ x: 0, y: 0 })
    expect(graph.getNodeAttributes('b')).toMatchObject({ x: 0, y: 0 })
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

describe('간선 종류와 글자', () => {
  const topic = (source: string, target: string, label: string) => ({
    source,
    target,
    type: 'TOPIC' as const,
    label,
  })

  it('주제 간선에 주제 이름을 붙이고 범례 값을 켠다', () => {
    const { graph, hasTopics, hasReferences } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links: [topic('a', 'b', '공부 · 전공')],
    })
    const edge = graph.edge('a', 'b')
    expect(graph.getEdgeAttribute(edge, 'label')).toBe('공부 · 전공')
    expect(hasTopics).toBe(true)
    expect(hasReferences).toBe(false)
  })

  it('수정된 문서를 참조하는 선만 빨갛게 경고한다', () => {
    const links = [
      { source: 'a', target: 'b', type: 'REFERENCES' as const, label: '참조' },
      { source: 'b', target: 'c', type: 'REFERENCES' as const, label: '참조' },
      topic('a', 'c', '보안'),
    ]
    const { graph, hasWarnings } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC'), doc('c', 'ETC')],
      links,
      modifiedDocuments: [{ id: 'b', title: '연차 규정' }],
    })
    const warned = graph.getEdgeAttributes(graph.edge('a', 'b'))
    expect(warned.warning).toBe(true)
    expect(warned.label).toBe('경고! 내용 확인 필요 · 연차 규정 수정됨 · 참조')
    expect(graph.getEdgeAttribute(graph.edge('b', 'c'), 'warning')).toBeUndefined()
    expect(graph.getEdgeAttribute(graph.edge('a', 'c'), 'warning')).toBeUndefined()
    expect(hasWarnings).toBe(true)
  })

  it('수정 제안으로 해소한 문서는 충돌을 지우고 참조와 주제만 남긴다', () => {
    const { graph, hasConflicts, hasWarnings } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links: [
        { source: 'a', target: 'b', type: 'CONFLICTS', label: '충돌' },
        { source: 'a', target: 'b', type: 'REFERENCES', label: '참조' },
      ],
      resolvedPairs: [['a', 'b']],
    })
    const attributes = graph.getEdgeAttributes(graph.edge('a', 'b'))
    expect(attributes.type).toBe('REFERENCES')
    expect(attributes.label).toBe('참조')
    expect(attributes.warning).toBeUndefined()
    expect(hasConflicts).toBe(false)
    expect(hasWarnings).toBe(false)
  })

  it('다른 문서와의 충돌은 해소 처리와 무관하게 남긴다', () => {
    const { graph } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC'), doc('c', 'ETC')],
      links: [
        { source: 'a', target: 'b', type: 'CONFLICTS', label: '충돌' },
        { source: 'a', target: 'c', type: 'CONFLICTS', label: '충돌' },
      ],
      resolvedPairs: [['a', 'b']],
    })
    expect(graph.hasEdge('a', 'b')).toBe(false)
    expect(graph.getEdgeAttribute(graph.edge('a', 'c'), 'type')).toBe('CONFLICTS')
  })

  it('같은 문서 쌍은 충돌을 우선하고 글자를 합친다', () => {
    const links = [
      topic('a', 'b', '연차'),
      { source: 'a', target: 'b', type: 'CONFLICTS' as const, label: '충돌' },
      { source: 'b', target: 'a', type: 'REFERENCES' as const },
    ]
    const { graph, hasConflicts, hasTopics } = buildDocumentGraph({
      documents: [doc('a', 'REPORT'), doc('b', 'ETC')],
      links,
    })
    const attributes = graph.getEdgeAttributes(graph.edge('a', 'b'))
    expect(attributes.type).toBe('CONFLICTS')
    expect(attributes.label).toBe('연차 · 충돌')
    expect(hasConflicts).toBe(true)
    expect(hasTopics).toBe(false)
  })
})

describe('avoidEdgeNodeCrossings', () => {
  it('선분 위에 있는 관계없는 노드를 옆으로 밀어낸다', () => {
    const graph = makeGraph(node('a', 0, 0), node('b', 100, 0), node('c', 50, 0))
    graph.addEdge('a', 'b', { type: 'REFERENCES', size: 1, color: '#fff' })
    avoidEdgeNodeCrossings(graph, new Set())
    expect(graph.getNodeAttributes('c')).not.toMatchObject({ x: 50, y: 0 })
  })

  it('고정된(pinned) 노드는 밀지 않는다', () => {
    const graph = makeGraph(node('a', 0, 0), node('b', 100, 0), node('c', 50, 0))
    graph.addEdge('a', 'b', { type: 'REFERENCES', size: 1, color: '#fff' })
    avoidEdgeNodeCrossings(graph, new Set(['c']))
    expect(graph.getNodeAttributes('c')).toMatchObject({ x: 50, y: 0 })
  })

  it('긴 선분이어도 끝점에서 실제로 가까우면 건드리지 않는다(비율이 아니라 거리 기준)', () => {
    // t=0.1인 지점이지만 선분 길이가 1000이라 끝점(a)에서 실제로는 100 떨어져 있어, a의 이웃으로
    // 볼 만큼 가깝지 않다 — 교차로 간주해 밀어내야 한다.
    const graph = makeGraph(node('a', 0, 0), node('b', 1000, 0), node('c', 100, 0))
    graph.addEdge('a', 'b', { type: 'REFERENCES', size: 1, color: '#fff' })
    avoidEdgeNodeCrossings(graph, new Set())
    expect(graph.getNodeAttributes('c')).not.toMatchObject({ x: 100, y: 0 })
  })

  it('끝점에 실제로 가까운 노드(이웃)는 건드리지 않는다', () => {
    const graph = makeGraph(node('a', 0, 0), node('b', 100, 0), node('c', 5, 0))
    graph.addEdge('a', 'b', { type: 'REFERENCES', size: 1, color: '#fff' })
    avoidEdgeNodeCrossings(graph, new Set())
    expect(graph.getNodeAttributes('c')).toMatchObject({ x: 5, y: 0 })
  })
})

describe('separateEvidenceNodes', () => {
  it('겹친 노드끼리 떨어뜨린다', () => {
    const graph = makeGraph(node('a', 0, 0, 11), node('b', 0, 0, 11))
    separateEvidenceNodes(graph, new Set(['a', 'b']), new Set())
    const a = graph.getNodeAttributes('a')
    const b = graph.getNodeAttributes('b')
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual((a.size + b.size) / 2)
  })

  it('한쪽이 고정이면 그 쪽은 그대로 두고 반대쪽만 민다', () => {
    const graph = makeGraph(node('a', 0, 0, 11), node('b', 0, 0, 11))
    separateEvidenceNodes(graph, new Set(['a', 'b']), new Set(['a']))
    const a = graph.getNodeAttributes('a')
    const b = graph.getNodeAttributes('b')
    expect(a).toMatchObject({ x: 0, y: 0 })
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual((a.size + b.size) / 2)
  })

  it('둘 다 고정이면 겹친 채로 둔다', () => {
    const graph = makeGraph(node('a', 0, 0, 11), node('b', 0, 0, 11))
    separateEvidenceNodes(graph, new Set(['a', 'b']), new Set(['a', 'b']))
    expect(graph.getNodeAttributes('a')).toMatchObject({ x: 0, y: 0 })
    expect(graph.getNodeAttributes('b')).toMatchObject({ x: 0, y: 0 })
  })
})
