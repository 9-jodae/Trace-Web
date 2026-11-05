import Graph from 'graphology'
import type { Document } from '@/entities/document'
import { documentTypeColor, documentTypeLabel } from '@/entities/document'

/**
 * 문서 간 연결선. docs199-Server GET /api/graph(Issue #22)의 edges와 맞춥니다.
 * type은 엣지 색을 구분하는 데만 씁니다(REFERENCES=파랑, CONFLICTS=주황).
 */
export interface DocumentLink {
  source: string
  target: string
  type?: 'REFERENCES' | 'CONFLICTS'
}

export interface NodeAttributes {
  x: number
  y: number
  size: number
  color: string
  label: string
  highlighted: boolean
  documentType: string | null
  extension: string
  authoredAt: string | null
}

export interface EdgeAttributes {
  type: 'REFERENCES' | 'CONFLICTS'
  size: number
  color: string
}

/** 다크 배경(그래프 영역)에서 포커스 중이 아닌 노드를 흐리게 보일 때 쓰는 색(파란 톤에 맞춤). */
export const DIMMED_COLOR = '#1e293b'

const NODE_SIZE = 6
const EVIDENCE_NODE_SIZE = 11
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export interface TypeLegendItem {
  /** 서버가 준 문서 유형 값. 분류 전이면 null */
  type: string | null
  label: string
  color: string
  count: number
}

/** 문서 유형별 범례. 색과 표시명은 entities/document의 고정 맵(실제 서버 enum 5종)을 씁니다. */
export function typeLegend(documents: Document[]): TypeLegendItem[] {
  const counts = new Map<string | null, number>()
  for (const document of documents) {
    counts.set(document.documentType, (counts.get(document.documentType) ?? 0) + 1)
  }
  const types = [...counts.keys()].filter((type): type is string => type !== null).sort()
  const items: TypeLegendItem[] = types.map((type) => ({
    type,
    label: documentTypeLabel(type),
    color: documentTypeColor(type),
    count: counts.get(type) ?? 0,
  }))
  if (counts.has(null)) {
    items.push({
      type: null,
      label: documentTypeLabel(null),
      color: documentTypeColor(null),
      count: counts.get(null) ?? 0,
    })
  }
  return items
}

/**
 * 유형별로 따로 뭉치지 않도록, 유형 그룹을 한 명씩 돌아가며 뽑아 하나의 해바라기 나선에 섞어 배치합니다.
 * 유형 구분은 색으로만 하고, 위치는 화면 전체에 고르게 섞여 보이게 합니다.
 * 연결선이 생기면 힘 기반 배치로 바꿀 수 있습니다.
 */
export function layoutByType(documents: Document[], legend: TypeLegendItem[]) {
  const positions = new Map<string, { x: number; y: number }>()
  const groups = legend.map((item) =>
    documents
      .filter((document) => document.documentType === item.type)
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)),
  )
  const maxGroupSize = Math.max(0, ...groups.map((group) => group.length))
  const interleaved: Document[] = []
  for (let round = 0; round < maxGroupSize; round += 1) {
    for (const group of groups) {
      const document = group[round]
      if (document) interleaved.push(document)
    }
  }

  interleaved.forEach((document, index) => {
    // 노드 지름(최대 11)보다 훨씬 넉넉한 간격으로 벌려야 다닥다닥 붙어 보이지 않습니다.
    const r = 20 * Math.sqrt(index)
    positions.set(document.id, {
      x: r * Math.cos(index * GOLDEN_ANGLE),
      y: r * Math.sin(index * GOLDEN_ANGLE),
    })
  })
  return positions
}

/** REFERENCES 엣지 색(파랑, 노드 톤에 맞춤). */
const REFERENCE_EDGE_COLOR = 'rgba(96,165,250,0.25)'
/** CONFLICTS 엣지 색(주황, 문서끼리 값이 다르다는 경고 느낌). */
const CONFLICT_EDGE_COLOR = 'rgba(251,146,60,0.55)'

/**
 * 문서 그래프를 만듭니다. 근거 문서가 있으면 크게 강조하고 나머지는 흐리게 표시합니다.
 * 서버가 권한 범위의 문서만 주므로, 권한 없는 문서는 노드로 나타나지 않습니다.
 * `documents`는 호출하는 쪽에서 필터(features/filter-documents)를 적용해 넘깁니다.
 */
export function buildDocumentGraph({
  documents,
  links = [],
  evidenceDocumentIds = [],
}: {
  documents: Document[]
  links?: DocumentLink[]
  evidenceDocumentIds?: string[]
}) {
  const visible = documents.filter((document) => document.deletedAt === null)
  const legend = typeLegend(visible)
  const colorOf = new Map(legend.map((item) => [item.type, item.color]))
  const positions = layoutByType(visible, legend)
  const evidence = new Set(evidenceDocumentIds)
  const focusing = visible.some((document) => evidence.has(document.id))

  const graph = new Graph<NodeAttributes, EdgeAttributes>({ type: 'undirected', multi: false })
  for (const document of visible) {
    const isEvidence = evidence.has(document.id)
    const position = positions.get(document.id) ?? { x: 0, y: 0 }
    graph.addNode(document.id, {
      ...position,
      label: document.title,
      documentType: document.documentType,
      extension: document.extension,
      authoredAt: document.authoredAt,
      size: isEvidence ? EVIDENCE_NODE_SIZE : NODE_SIZE,
      highlighted: isEvidence,
      color:
        focusing && !isEvidence
          ? DIMMED_COLOR
          : (colorOf.get(document.documentType) ?? documentTypeColor(document.documentType)),
    })
  }
  for (const link of links) {
    if (link.source === link.target) continue
    if (!graph.hasNode(link.source) || !graph.hasNode(link.target)) continue
    const isConflict = link.type === 'CONFLICTS'
    if (graph.hasEdge(link.source, link.target)) {
      // 같은 문서 쌍에 참조·충돌이 둘 다 있으면 충돌이 우선합니다(그래프는 쌍마다 선 하나만
      // 그릴 수 있고, 서버가 엣지를 무작위 순서로 보내므로 도착 순서에 기대면 안 됩니다).
      if (!isConflict) continue
      const edgeKey = graph.edge(link.source, link.target)
      if (graph.getEdgeAttribute(edgeKey, 'type') === 'CONFLICTS') continue
      graph.mergeEdgeAttributes(edgeKey, {
        type: 'CONFLICTS',
        size: 1.5,
        color: CONFLICT_EDGE_COLOR,
      })
      continue
    }
    graph.addEdge(link.source, link.target, {
      type: isConflict ? 'CONFLICTS' : 'REFERENCES',
      size: isConflict ? 1.5 : 1,
      color: isConflict ? CONFLICT_EDGE_COLOR : REFERENCE_EDGE_COLOR,
    })
  }

  let hasReferences = false
  let hasConflicts = false
  graph.forEachEdge((_edge, attributes) => {
    if (attributes.type === 'CONFLICTS') hasConflicts = true
    else hasReferences = true
  })

  return { graph, legend, hasReferences, hasConflicts }
}
