import Graph from 'graphology'
import type { Document } from '@/entities/document'
import { documentTypeColor, documentTypeLabel } from '@/entities/document'

/**
 * 문서 간 연결선. Trace-Server GET /api/graph(Issue #22)의 edges와 맞춥니다.
 * type은 엣지 색을 구분하는 데 씁니다(REFERENCES=파랑, CONFLICTS=빨강, TOPIC=청록).
 * label은 선 위에 표시할 글자입니다.
 */
type LinkType = 'REFERENCES' | 'CONFLICTS' | 'TOPIC'

export interface DocumentLink {
  source: string
  target: string
  type?: LinkType
  label?: string
  /** 참조하는 문서의 보안 등급이 더 낮은 선 */
  securityRisk?: boolean
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

export interface ModifiedDocument {
  id: string
  title: string
}

export interface EdgeAttributes {
  /** 참조하는 문서가 수정돼 다시 확인해야 하는 선 */
  warning?: boolean
  type: LinkType
  size: number
  color: string
  label?: string
  /** 양 끝 문서 중 한쪽에서 가장 중요한 선. 노드를 고르지 않았을 때는 이 선만 그립니다. */
  primary?: boolean
}

/** 호버하지 않은 간선을 흐리게 보일 때 쓰는 색. 거의 보이지 않을 만큼만 남겨 구조의 윤곽만 드러냅니다. */
export const DIMMED_EDGE_COLOR = 'rgba(148,163,184,0.07)'

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

export function isResolvedPair(pairs: [string, string][], first: string, second: string) {
  return pairs.some(([a, b]) => (a === first && b === second) || (a === second && b === first))
}

const WARNING_EDGE_COLOR = 'rgba(248,113,113,0.95)'

export const SECURITY_RISK_WARNING = '경고! 보안 위험 · 열람 등급 불일치'

function markWarning(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  link: DocumentLink,
  warning: string,
) {
  if (!graph.hasEdge(link.source, link.target)) return
  const edge = graph.edge(link.source, link.target) as string
  const label = graph.getEdgeAttribute(edge, 'label')
  if (label?.includes(warning)) return
  graph.mergeEdgeAttributes(edge, {
    warning: true,
    color: WARNING_EDGE_COLOR,
    size: 2.5,
    label: label ? `${warning} · ${label}` : warning,
  })
}

/** 수정된 문서를 참조하는 문서는 내용을 다시 확인해야 하므로 선을 빨갛게 하고 경고를 앞에 둡니다. */
function markModifiedReferences(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  links: DocumentLink[],
  modified: ModifiedDocument[],
) {
  for (const { id, title } of modified) {
    for (const link of links) {
      if (link.target !== id || (link.type ?? 'REFERENCES') !== 'REFERENCES') continue
      markWarning(graph, link, `경고! 내용 확인 필요 · ${title} 수정됨`)
    }
  }
}

/** 한 문서 쌍의 관계 글자를 합칩니다. 경고를 맨 앞에 둡니다. 주제와 참조가 함께 있으면 "보안 참조"처럼 읽히게 붙입니다. */
function edgeLabel(parts: Map<LinkType, string>) {
  const topic = parts.get('TOPIC')
  const reference = parts.get('REFERENCES')
  const relation = topic && reference ? `${topic} ${reference}` : (topic ?? reference)
  return [parts.get('CONFLICTS'), relation].filter(Boolean).join(' · ') || undefined
}

/**
 * 문서 그래프를 만듭니다. 근거 문서가 있으면 크게 강조합니다(다른 노드·선은 건드리지 않습니다).
 * 서버가 권한 범위의 문서만 주므로, 권한 없는 문서는 노드로 나타나지 않습니다.
 * `documents`는 호출하는 쪽에서 필터(features/filter-documents)를 적용해 넘깁니다.
 */
export function buildDocumentGraph({
  documents,
  links = [],
  evidenceDocumentIds = [],
  positionOverrides,
  modifiedDocuments = [],
  resolvedPairs = [],
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
  modifiedDocuments?: ModifiedDocument[]
  /** 수정 제안으로 해소한 문서 쌍. 이 쌍의 충돌만 그리지 않습니다. */
  resolvedPairs?: [string, string][]
}) {
  const visible = documents.filter((document) => document.deletedAt === null)
  const legend = typeLegend(visible)
  const colorOf = new Map(legend.map((item) => [item.type, item.color]))
  const positions = layoutByType(visible, legend)
  const evidence = new Set(evidenceDocumentIds)

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
      color: colorOf.get(document.documentType) ?? documentTypeColor(document.documentType),
    })
  }
  // 사용자가 끌어서 옮긴 노드는 아래 두 보정에서 제외합니다 — positionOverrides의 약속("옮긴
  // 위치가 그대로 유지됩니다")을 지키려면, 자동 보정이 그 자리를 다시 밀면 안 됩니다.
  const pinned = new Set(positionOverrides?.keys() ?? [])
  const labelParts = new Map<string, Map<LinkType, string>>()
  for (const link of links) {
    if (link.source === link.target) continue
    if (link.type === 'CONFLICTS' && isResolvedPair(resolvedPairs, link.source, link.target)) {
      continue
    }
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

  markModifiedReferences(graph, links, modifiedDocuments)
  for (const link of links) {
    if (link.securityRisk) markWarning(graph, link, SECURITY_RISK_WARNING)
  }

  let hasReferences = false
  let hasConflicts = false
  let hasTopics = false
  graph.forEachEdge((_edge, attributes) => {
    if (attributes.type === 'CONFLICTS') hasConflicts = true
    else if (attributes.type === 'TOPIC') hasTopics = true
    else hasReferences = true
  })

  const hasWarnings = graph.someEdge((_edge, attributes) => attributes.warning === true)
  markPrimaryEdges(graph)

  return { graph, legend, hasReferences, hasConflicts, hasTopics, hasWarnings }
}

/** 경고, 충돌, 주제, 참조 순으로 중요합니다. */
function edgePriority(attributes: EdgeAttributes) {
  return attributes.warning ? 3 : EDGE_STYLE[attributes.type].rank
}

/** 문서마다 가장 중요한 선 하나를 고릅니다. 같은 순위면 먼저 들어온 선을 씁니다. */
export function markPrimaryEdges(graph: Graph<NodeAttributes, EdgeAttributes>) {
  graph.forEachNode((node) => {
    let best: string | null = null
    let bestPriority = -1
    graph.forEachEdge(node, (edge, attributes) => {
      const priority = edgePriority(attributes)
      if (priority > bestPriority) {
        best = edge
        bestPriority = priority
      }
    })
    if (best !== null) graph.setEdgeAttribute(best, 'primary', true)
  })
}

/** 호버한 노드의 바로 이웃을 그 둘레에 떨어뜨려 놓을 거리(그래프 좌표 단위). */
const HOVER_RADIAL_SPREAD = 45

/**
 * 호버한 노드의 바로 이웃만 그 주변에 바퀴살처럼 임시로 펼쳐 놓습니다. 유형별 해바라기 배치는
 * 연결 관계를 모르고 정해지므로, 호버한 노드의 이웃이 화면 반대편에 있을 수 있어 강조된 선이
 * 길게 가로지르며 다른 선과 교차해 보이는 문제가 있습니다. 호출한 쪽(SigmaCanvas)이 이 결과로
 * sigma 렌더링에서만 노드 위치를 잠깐 덮어쓰고, 그래프의 실제 x/y는 바꾸지 않습니다 — 호버가
 * 끝나면 그대로 원래 자리로 돌아갑니다.
 */
export function computeHoverRadialPositions(
  graph: Graph<NodeAttributes>,
  center: string,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  if (!graph.hasNode(center)) return positions
  const centerPosition = graph.getNodeAttributes(center)
  const neighbors = graph.neighbors(center)
  neighbors.forEach((neighbor, index) => {
    const angle = (index / neighbors.length) * Math.PI * 2
    positions.set(neighbor, {
      x: centerPosition.x + HOVER_RADIAL_SPREAD * Math.cos(angle),
      y: centerPosition.y + HOVER_RADIAL_SPREAD * Math.sin(angle),
    })
  })
  return positions
}
