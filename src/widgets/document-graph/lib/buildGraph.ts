import Graph from 'graphology'
import type { Document } from '@/entities/document'

/**
 * 문서 간 연결선. 서버의 문서 관계 그래프 API(docs199-Server #22)가 아직 없어
 * 임시로 정의한 형태입니다. API가 확정되면 서버 응답에 맞춰 바꿉니다.
 */
export interface DocumentLink {
  source: string
  target: string
}

export interface NodeAttributes {
  x: number
  y: number
  size: number
  color: string
  label: string
  highlighted: boolean
  documentType: string | null
}

/** 유형별 노드 색. 유형 수 상한(8개 이하 권장)이 정해지지 않아 넘치면 앞 색을 다시 씁니다. */
export const TYPE_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#db2777',
  '#ca8a04',
  '#4f46e5',
]
export const UNCLASSIFIED_COLOR = '#94a3b8'
export const DIMMED_COLOR = '#e2e8f0'

const NODE_SIZE = 6
const EVIDENCE_NODE_SIZE = 11
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export interface TypeLegendItem {
  /** 서버가 준 문서 유형 값. 분류 전이면 null */
  type: string | null
  color: string
  count: number
}

/** 문서 유형을 정렬해 색을 정합니다. 분류 전 문서는 마지막에 회색으로 둡니다. */
export function typeLegend(documents: Document[]): TypeLegendItem[] {
  const counts = new Map<string | null, number>()
  for (const document of documents) {
    counts.set(document.documentType, (counts.get(document.documentType) ?? 0) + 1)
  }
  const types = [...counts.keys()].filter((type): type is string => type !== null).sort()
  const items: TypeLegendItem[] = types.map((type, index) => ({
    type,
    color: TYPE_PALETTE[index % TYPE_PALETTE.length] ?? UNCLASSIFIED_COLOR,
    count: counts.get(type) ?? 0,
  }))
  if (counts.has(null))
    items.push({ type: null, color: UNCLASSIFIED_COLOR, count: counts.get(null) ?? 0 })
  return items
}

/**
 * 같은 유형끼리 모이도록 유형마다 원 위에 중심을 두고, 그 주변에 해바라기 모양으로 배치합니다.
 * 연결선이 생기면 힘 기반 배치로 바꿀 수 있습니다.
 */
export function layoutByType(documents: Document[], legend: TypeLegendItem[]) {
  const positions = new Map<string, { x: number; y: number }>()
  const groupRadius = legend.length > 1 ? 30 * Math.sqrt(legend.length) : 0

  legend.forEach((item, groupIndex) => {
    const angle = (2 * Math.PI * groupIndex) / legend.length
    const cx = groupRadius * Math.cos(angle)
    const cy = groupRadius * Math.sin(angle)
    documents
      .filter((document) => document.documentType === item.type)
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
      .forEach((document, index) => {
        const r = 3 * Math.sqrt(index)
        positions.set(document.id, {
          x: cx + r * Math.cos(index * GOLDEN_ANGLE),
          y: cy + r * Math.sin(index * GOLDEN_ANGLE),
        })
      })
  })
  return positions
}

/**
 * 문서 그래프를 만듭니다. 근거 문서가 있으면 크게 강조하고 나머지는 흐리게 표시합니다.
 * 서버가 권한 범위의 문서만 주므로, 권한 없는 문서는 노드로 나타나지 않습니다.
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

  const graph = new Graph<NodeAttributes>({ type: 'undirected', multi: false })
  for (const document of visible) {
    const isEvidence = evidence.has(document.id)
    const position = positions.get(document.id) ?? { x: 0, y: 0 }
    graph.addNode(document.id, {
      ...position,
      label: document.title,
      documentType: document.documentType,
      size: isEvidence ? EVIDENCE_NODE_SIZE : NODE_SIZE,
      highlighted: isEvidence,
      color:
        focusing && !isEvidence
          ? DIMMED_COLOR
          : (colorOf.get(document.documentType) ?? UNCLASSIFIED_COLOR),
    })
  }
  for (const link of links) {
    if (link.source === link.target) continue
    if (!graph.hasNode(link.source) || !graph.hasNode(link.target)) continue
    if (graph.hasEdge(link.source, link.target)) continue
    graph.addEdge(link.source, link.target, { size: 1, color: '#cbd5e1' })
  }
  return { graph, legend }
}
