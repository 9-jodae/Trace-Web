import Graph from 'graphology'
import type { Document } from '@/entities/document'
import { documentTypeColor, documentTypeLabel } from '@/entities/document'

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
  extension: string
  authoredAt: string | null
}

/** 다크 배경(그래프 영역)에서 포커스 중이 아닌 노드를 흐리게 보일 때 쓰는 색. */
export const DIMMED_COLOR = '#3a3733'

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

  const graph = new Graph<NodeAttributes>({ type: 'undirected', multi: false })
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
    if (graph.hasEdge(link.source, link.target)) continue
    graph.addEdge(link.source, link.target, { size: 1, color: 'rgba(255,255,255,0.12)' })
  }
  return { graph, legend }
}
