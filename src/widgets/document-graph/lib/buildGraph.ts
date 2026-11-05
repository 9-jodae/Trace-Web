import Graph from 'graphology'
import type { Document } from '@/entities/document'
import { documentTypeColor, documentTypeLabel } from '@/entities/document'

/**
 * 문서 간 연결선. docs199-Server GET /api/graph(Issue #22)의 edges와 맞춥니다.
 * type은 엣지 색을 구분하는 데 씁니다(REFERENCES=파랑, CONFLICTS=빨강, TOPIC=청록).
 * label은 선 위에 표시할 글자입니다.
 */
type LinkType = 'REFERENCES' | 'CONFLICTS' | 'TOPIC'

export interface DocumentLink {
  source: string
  target: string
  type?: LinkType
  label?: string
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
  type: LinkType
  size: number
  color: string
  label?: string
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
 * 연결선(GET /api/graph)이 생긴 뒤에도 힘 기반 배치 대신 이 배치를 씁니다(docs/architecture.md).
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
    // 노드 지름(근거로 커지면 최대 11)보다 훨씬 넉넉한 간격으로 벌려야 다닥다닥 붙어 보이지
    // 않습니다. 근거 노드끼리의 겹침은 separateEvidenceNodes가 한 번 더 보정합니다.
    const r = 36 * Math.sqrt(index)
    positions.set(document.id, {
      x: r * Math.cos(index * GOLDEN_ANGLE),
      y: r * Math.sin(index * GOLDEN_ANGLE),
    })
  })
  return positions
}

/** 근거 노드 사이에 여유를 더 두어, 커진 원끼리 닿아 보이지 않게 합니다. */
const EVIDENCE_GAP = 4

/**
 * 근거로 강조된(그래서 평소보다 큰) 노드끼리만 서로 밀어내 겹침을 풉니다. 근거 수는 서버 sources
 * 개수에 달려 있어 코드로 보장되지 않으므로, 패스 수를 노드 수에 맞춰 늘립니다. `pinned`로 넘긴
 * 노드(사용자가 끌어서 옮긴 노드)는 밀지 않습니다 — 둘 다 고정이면 그 쌍은 그대로 둡니다.
 */
export function separateEvidenceNodes(
  graph: Graph<NodeAttributes>,
  evidenceIds: Set<string>,
  pinned: Set<string>,
) {
  const ids = [...evidenceIds].filter((id) => graph.hasNode(id))
  const passes = Math.max(4, ids.length)
  for (let pass = 0; pass < passes; pass += 1) {
    let moved = false
    for (let i = 0; i < ids.length; i += 1) {
      const idA = ids[i] as string
      for (let j = i + 1; j < ids.length; j += 1) {
        const idB = ids[j] as string
        if (pinned.has(idA) && pinned.has(idB)) continue
        const a = graph.getNodeAttributes(idA)
        const b = graph.getNodeAttributes(idB)
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy)
        const minDistance = (a.size + b.size) / 2 + EVIDENCE_GAP
        if (distance >= minDistance) continue
        moved = true
        const overlap = minDistance - distance
        // 두 노드가 완전히 같은 자리에 있으면 임의의 방향으로 벌립니다.
        const [ux, uy] = distance > 0 ? [dx / distance, dy / distance] : [1, 0]
        if (pinned.has(idA)) {
          graph.mergeNodeAttributes(idB, { x: b.x + ux * overlap, y: b.y + uy * overlap })
        } else if (pinned.has(idB)) {
          graph.mergeNodeAttributes(idA, { x: a.x - ux * overlap, y: a.y - uy * overlap })
        } else {
          const push = overlap / 2
          graph.mergeNodeAttributes(idA, { x: a.x - ux * push, y: a.y - uy * push })
          graph.mergeNodeAttributes(idB, { x: b.x + ux * push, y: b.y + uy * push })
        }
      }
    }
    if (!moved) break
  }
}

/** 연결선과 관계없는 노드 사이에 둘 최소 여유. */
const EDGE_NODE_CLEARANCE = 10

/**
 * 연결선이 양 끝과 관계없는 다른 노드 위를 그대로 지나가 보이지 않도록, 선에 너무 가까운
 * 노드를 옆으로 밀어냅니다. 배치 자체는 유형 기준이라 어떤 노드끼리 연결되는지 모르고 정해지므로,
 * 다 그린 뒤 가볍게 보정하는 패스입니다(교차를 100% 없앤다는 보장은 아닙니다). `pinned`로 넘긴
 * 노드(사용자가 끌어서 옮긴 노드)는 밀지 않습니다.
 */
export function avoidEdgeNodeCrossings(graph: Graph<NodeAttributes>, pinned: Set<string>) {
  const edges = graph.edges().map((edge) => {
    const [source, target] = graph.extremities(edge)
    return { source, target }
  })
  if (edges.length === 0) return

  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false
    for (const { source, target } of edges) {
      const a = graph.getNodeAttributes(source)
      const b = graph.getNodeAttributes(target)
      const abx = b.x - a.x
      const aby = b.y - a.y
      const lengthSq = abx * abx + aby * aby
      if (lengthSq === 0) continue
      const length = Math.sqrt(lengthSq)

      graph.forEachNode((nodeId, node) => {
        if (nodeId === source || nodeId === target) return
        if (pinned.has(nodeId)) return
        const t = ((node.x - a.x) * abx + (node.y - a.y) * aby) / lengthSq
        const along = t * length
        // 선분 양 끝 가까이는 원래 이웃이라 자연스레 가까울 수 있어 건드리지 않습니다. 비율이
        // 아니라 실제 거리로 재야, 긴 선분에서 끝점 근처 교차를 놓치지 않습니다.
        const startGuard = a.size / 2 + node.size / 2 + EDGE_NODE_CLEARANCE
        const endGuard = b.size / 2 + node.size / 2 + EDGE_NODE_CLEARANCE
        if (along < startGuard || length - along < endGuard) return
        const closestX = a.x + t * abx
        const closestY = a.y + t * aby
        const dx = node.x - closestX
        const dy = node.y - closestY
        const distance = Math.hypot(dx, dy)
        const clearance = node.size / 2 + EDGE_NODE_CLEARANCE
        if (distance >= clearance) return
        moved = true
        const push = clearance - distance
        // 선과 완전히 겹치면(distance 0) 선의 수직 방향으로 밉니다.
        const [nx, ny] =
          distance > 0 ? [dx / distance, dy / distance] : [-aby / length, abx / length]
        graph.mergeNodeAttributes(nodeId, { x: node.x + nx * push, y: node.y + ny * push })
      })
    }
    if (!moved) break
  }
}

/** REFERENCES 엣지 색(파랑, 노드 톤에 맞춤). */
const REFERENCE_EDGE_COLOR = 'rgba(147,197,253,0.95)'
/** CONFLICTS 엣지 색(빨강, 문서끼리 값이 달라 확인이 필요하다는 경고). */
const CONFLICT_EDGE_COLOR = 'rgba(248,113,113,0.95)'
/** TOPIC 엣지 색(청록, 같은 주제로 묶인 문서). */
const TOPIC_EDGE_COLOR = 'rgba(45, 212, 191, 0.75)'

const EDGE_STYLE: Record<LinkType, { rank: number; size: number; color: string }> = {
  REFERENCES: { rank: 0, size: 2, color: REFERENCE_EDGE_COLOR },
  TOPIC: { rank: 1, size: 2.2, color: TOPIC_EDGE_COLOR },
  CONFLICTS: { rank: 2, size: 2.5, color: CONFLICT_EDGE_COLOR },
}

function edgeStyle(type: LinkType) {
  return { type, size: EDGE_STYLE[type].size, color: EDGE_STYLE[type].color }
}

/** 충돌 간선의 경고 문구. 서버가 항목을 주면 무엇이 다른지 함께 보여 줍니다. */
export function conflictWarning(item?: string) {
  return item ? `경고! 내용 충돌 · ${item}` : '경고! 내용 충돌'
}

/** 한 문서 쌍의 관계 글자를 합칩니다. 경고를 맨 앞에 둡니다. 주제와 참조가 함께 있으면 "보안 참조"처럼 읽히게 붙입니다. */
function edgeLabel(parts: Map<LinkType, string>) {
  const topic = parts.get('TOPIC')
  const reference = parts.get('REFERENCES')
  const relation = topic && reference ? `${topic} ${reference}` : (topic ?? reference)
  return [parts.get('CONFLICTS'), relation].filter(Boolean).join(' · ') || undefined
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
  positionOverrides,
}: {
  documents: Document[]
  links?: DocumentLink[]
  evidenceDocumentIds?: string[]
  /**
   * 사용자가 끌어서 옮긴 노드의 위치. 여기 있는 문서는 계산된 배치 대신 이 위치를
   * 그대로 써서, 새 답변·필터 변경으로 그래프를 다시 만들어도 사용자가 옮긴 위치가 유지됩니다.
   * 여기 없는 문서는 해바라기 배치로 매번 새로 계산한 위치를 받습니다.
   */
  positionOverrides?: Map<string, { x: number; y: number }>
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
    const position = positionOverrides?.get(document.id) ??
      positions.get(document.id) ?? { x: 0, y: 0 }
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
  // 사용자가 끌어서 옮긴 노드는 아래 두 보정에서 제외합니다 — positionOverrides의 약속("옮긴
  // 위치가 그대로 유지됩니다")을 지키려면, 자동 보정이 그 자리를 다시 밀면 안 됩니다.
  const pinned = new Set(positionOverrides?.keys() ?? [])
  const labelParts = new Map<string, Map<LinkType, string>>()
  for (const link of links) {
    if (link.source === link.target) continue
    if (!graph.hasNode(link.source) || !graph.hasNode(link.target)) continue
    const type = link.type ?? 'REFERENCES'
    if (graph.hasEdge(link.source, link.target)) {
      // 그래프는 문서 쌍마다 선 하나만 그립니다. 서버의 엣지 순서와 무관하게 충돌, 주제, 참조
      // 순으로 선의 종류를 정하고, 글자는 합쳐서 모두 보여 줍니다.
      const edgeKey = graph.edge(link.source, link.target) as string
      const parts = labelParts.get(edgeKey) ?? new Map<LinkType, string>()
      if (link.label) parts.set(type, link.label)
      labelParts.set(edgeKey, parts)
      const label = edgeLabel(parts)
      const current = graph.getEdgeAttributes(edgeKey)
      const stronger = EDGE_STYLE[type].rank > EDGE_STYLE[current.type].rank
      graph.mergeEdgeAttributes(edgeKey, stronger ? { ...edgeStyle(type), label } : { label })
      continue
    }
    const edgeKey = graph.addEdge(link.source, link.target, {
      ...edgeStyle(type),
      label: link.label,
    })
    if (link.label) labelParts.set(edgeKey, new Map([[type, link.label]]))
  }

  // 교차 보정을 먼저 하고, 근거 노드 분리를 마지막에 해야 근거 노드끼리의 간격이 교차 보정으로
  // 다시 깨지지 않습니다(근거 강조가 더 중요한 규칙이라 마지막에 적용).
  avoidEdgeNodeCrossings(graph, pinned)
  separateEvidenceNodes(graph, evidence, pinned)

  let hasReferences = false
  let hasConflicts = false
  let hasTopics = false
  graph.forEachEdge((_edge, attributes) => {
    if (attributes.type === 'CONFLICTS') hasConflicts = true
    else if (attributes.type === 'TOPIC') hasTopics = true
    else hasReferences = true
  })

  return { graph, legend, hasReferences, hasConflicts, hasTopics }
}
