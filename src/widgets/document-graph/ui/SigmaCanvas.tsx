import '@react-sigma/core/lib/style.css'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import type Graph from 'graphology'
import { DEFAULT_STYLES, type Sigma } from 'sigma'
import type { EdgeDisplayData, NodeDisplayData, SigmaOptions } from 'sigma/types'
import { useEffect, type CSSProperties } from 'react'
import { documentTypeColor } from '@/entities/document'
import {
  computeHopMap,
  MAX_BRANCH_HOP,
  type EdgeAttributes,
  type NodeAttributes,
} from '../lib/buildGraph'

export interface NodeHover {
  nodeId: string
  /** 컨테이너 기준 픽셀 좌표. 툴팁을 그 옆에 띄우는 데 씁니다. */
  x: number
  y: number
}

// dragPositionToAttributes가 드래그 중 위치를 읽을 live 그래프. SIGMA_OPTIONS는 아래처럼 한 번만
// 만든 안정된 객체여야 해서 컴포넌트 props(graph)를 직접 캡처할 수 없어, GraphEvents가 sigma
// 인스턴스를 받을 때(onReady) sigma.getGraph()로 채워 둡니다(참고: useLoadGraph는 우리가 넘긴
// graph를 그대로 쓰지 않고 sigma 내부 그래프로 복사해 가져가므로, 드래그 중 실제로 바뀌는 건
// sigma.getGraph()입니다).
let liveGraph: Graph<NodeAttributes> | null = null

// edgeReducer가 읽을 "지금 마우스가 올라가 있는 노드". 같은 이유로 SIGMA_OPTIONS 밖의
// 모듈 변수로 두고, GraphEvents의 enterNode/leaveNode에서 갱신한 뒤 sigma.refresh()로
// 다시 그리게 합니다.
let hoveredNodeId: string | null = null

/** 1보다 작을수록 마우스를 움직인 거리보다 노드가 덜 움직입니다(끌기 민감도). */
const DRAG_DAMPING = 0.35

/** 간선이 너무 많이 겹쳐 엉켜 보이는 걸 줄이려고, 기본은 모두 흐리게 두고 호버한 노드의
 * 간선만 원래 색으로 복원합니다. */
const DIMMED_EDGE_COLOR = 'rgba(148, 163, 184, 0.08)'

// 그래프 탭을 열 때 한 번, 노드·간선이 작고 투명하게 시작해 제 크기·색으로 커지는 등장
// 애니메이션에 쓰는 진행도(0~1). nodeReducer/edgeReducer가 매 프레임 이 값을 읽으므로
// SIGMA_OPTIONS 밖의 모듈 변수로 둡니다(liveGraph·hoveredNodeId와 같은 이유).
let appearProgress = 1
let appearAnimationFrame: number | null = null

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

/** sigma 인스턴스가 새로 만들어질 때(그래프 탭을 열 때)마다 한 번 재생합니다. */
function playAppearAnimation(sigma: Sigma) {
  if (appearAnimationFrame !== null) cancelAnimationFrame(appearAnimationFrame)
  const duration = 500
  const start = performance.now()
  appearProgress = 0
  const step = (now: number) => {
    appearProgress = easeOutCubic(Math.min(1, (now - start) / duration))
    sigma.refresh({ skipIndexation: true })
    appearAnimationFrame = appearProgress < 1 ? requestAnimationFrame(step) : null
  }
  appearAnimationFrame = requestAnimationFrame(step)
}

// 근거 문서(질문에 답한 출처)에서 연결선을 따라 몇 단계(hop) 떨어져 있는지. null이면 "가지 뻗기"
// 애니메이션이 꺼진 상태(근거 없음)로, 평소처럼 호버한 노드의 간선만 보여줍니다. 값이 있으면
// hop이 revealStep 이하인 노드·간선만 밝게 보이다가, revealStep이 하나씩 늘면서 점점 퍼집니다.
let hopByNode: Map<string, number> | null = null
let revealStep = -1
let hopTimers: ReturnType<typeof setTimeout>[] = []

/** hop 사이에 애니메이션이 퍼지는 간격(ms). 0.3~0.5초 사이로 너무 빠르지도 느리지도 않게. */
const HOP_REVEAL_INTERVAL_MS = 400

function clearHopAnimation() {
  for (const timer of hopTimers) clearTimeout(timer)
  hopTimers = []
}

/** 근거 문서가 바뀔 때마다(새 질문·근거 강조 토글) 한 번 재생합니다. */
function playHopAnimation(sigma: Sigma, graph: Graph<NodeAttributes>, evidenceIds: string[]) {
  clearHopAnimation()
  if (evidenceIds.length === 0) {
    hopByNode = null
    revealStep = -1
    sigma.refresh({ skipIndexation: true })
    return
  }
  hopByNode = computeHopMap(graph, evidenceIds, MAX_BRANCH_HOP)
  revealStep = 0
  sigma.refresh({ skipIndexation: true })
  for (let hop = 1; hop <= MAX_BRANCH_HOP; hop++) {
    hopTimers.push(
      setTimeout(() => {
        revealStep = hop
        sigma.refresh({ skipIndexation: true })
      }, hop * HOP_REVEAL_INTERVAL_MS),
    )
  }
}

/** CSS 색(hex 또는 rgb/rgba) 문자열에 알파를 곱합니다. 등장 애니메이션의 페이드인에 씁니다. */
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.length === 4 ? [...color.slice(1)].map((c) => c + c).join('') : color.slice(1)
    const value = Number.parseInt(hex, 16)
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
  }
  const match = /rgba?\(([^)]+)\)/.exec(color)
  const components = match?.[1]
  if (!components) return color
  const [r, g, b, a] = components.split(',').map((part) => Number.parseFloat(part))
  return `rgba(${r}, ${g}, ${b}, ${(a ?? 1) * alpha})`
}

// 렌더마다 새 객체를 넘기면 sigma를 다시 만들어 그리는 중에 오류가 납니다. 한 번만 만듭니다.
// 명시적으로 SigmaOptions 타입을 붙여서, nodeReducer/edgeReducer를 settings 안에 잘못 넣는
// 것 같은 실수를 타입 체커가 잡게 합니다(실제로 그런 실수가 있었습니다).
const SIGMA_OPTIONS: Partial<SigmaOptions<NodeAttributes, EdgeAttributes>> = {
  // 라벨 글자색 기본값(검정)이 다크 배경에서 안 보여서 밝은 색으로 바꿉니다.
  // labelVisibility를 'auto' 고정해 호버 시에만 강제로 뜨는 기본 라벨도 없앱니다.
  styles: {
    nodes: {
      ...DEFAULT_STYLES.nodes,
      labelColor: '#e8edf5',
      labelVisibility: 'auto',
      // backdrop은 원래 호버 시 뜨는 흰 알약(라벨 배경)이라 꺼 뒀는데(HoverTooltip과 겹침),
      // 여기서는 라벨이 아니라 노드 모양 자체(backdropArea: 'node')에 두는 용도로 켭니다.
      // 노드보다 살짝 크게(padding) 자기 색 그대로(attribute: 'color') 흐리게 번지게 해서
      // 그림자·글로우로 입체감을 줍니다. HoverTooltip의 흰 배경과는 무관합니다.
      backdropVisibility: 'visible',
      backdropArea: 'node',
      backdropColor: { attribute: 'color' },
      backdropShadowColor: 'rgba(2, 6, 23, 0.55)',
      backdropShadowBlur: 10,
      backdropPadding: 5,
    },
    // 관계 종류를 선 위 글자로 보여 줍니다. 글자색은 선 색과 맞춥니다.
    edges: [
      DEFAULT_STYLES.edges,
      {
        labelColor: '#5eead4',
        labelSize: 12,
        labelVisibility: 'visible',
        labelPosition: 'above',
      },
      {
        when: (attributes: { type?: string }) => attributes.type === 'CONFLICTS',
        then: { labelColor: '#fb923c' },
      },
      {
        when: (attributes: { type?: string }) => attributes.type === 'REFERENCES',
        then: { labelColor: '#93c5fd' },
      },
    ],
  },
  settings: {
    // 임계값을 높여 한 화면에 라벨이 한꺼번에 너무 많이 떠서 겹치는 걸 줄입니다.
    labelRenderedSizeThreshold: 16,
    // 노드를 누른 채로 끌면 위치가 바뀌게 합니다(x/y 속성에 직접 반영됨).
    enableNodeDrag: true,
    renderEdgeLabels: true,
    // 기본값대로면 마우스 이동량이 그대로(화면 배율만큼) 좌표 변화로 들어가, 그래프가 넓어질수록
    // 같은 마우스 움직임이 더 크게 반영돼 "조금만 움직여도 훅 튄다"는 느낌을 줍니다. 목표 위치로
    // 매 프레임 일부만 다가가게 해서 체감 민감도를 낮춥니다.
    dragPositionToAttributes: (position: { x: number; y: number }, node: string) => {
      if (!liveGraph?.hasNode(node)) return position
      const current = liveGraph.getNodeAttributes(node)
      return {
        x: current.x + (position.x - current.x) * DRAG_DAMPING,
        y: current.y + (position.y - current.y) * DRAG_DAMPING,
      }
    },
  },
  // nodeReducer/edgeReducer는 settings가 아니라 SigmaOptions의 최상위 속성입니다(sigma/types의
  // SigmaOptions 참고). settings 안에 넣으면 Settings 타입에 없는 키라 조용히 무시됩니다 —
  // 전체 옵션 객체를 SigmaContainer에 넘길 때 `as never`로 캐스팅해 타입 체크가 꺼져 있어서
  // 빌드는 통과하지만 런타임에 전혀 적용되지 않았습니다.
  nodeReducer: (_node: string, data: NodeDisplayData, attrs: NodeAttributes) => {
    let base = data
    // 근거 노드는 buildGraph에서 이미 제 색 그대로이고, 근거가 아닌 노드는 흐린 색(DIMMED_COLOR)으로
    // 깔려 있습니다(근거 강조 중일 때). hop이 지금까지 퍼진 단계(revealStep) 안이면 제 색으로
    // 되돌려 "가지가 뻗어나가며 밝아지는" 것처럼 보이게 합니다.
    if (hopByNode && !attrs.highlighted) {
      const hop = hopByNode.get(_node)
      if (hop !== undefined && hop <= revealStep) {
        base = { ...base, color: documentTypeColor(attrs.documentType) }
      }
    }
    // 등장 애니메이션 중에는 노드가 작고 투명하게 시작해 제 크기·색으로 커집니다.
    if (appearProgress >= 1) return base
    return {
      ...base,
      size: base.size * appearProgress,
      color: withAlpha(base.color, appearProgress),
    }
  },
  // 평소(근거 없음)에는 호버한 노드에 붙은 간선만 원래 색으로 보여주고 나머지는 흐립니다.
  // 근거가 있으면(질문에 답했을 때) hop이 revealStep 이하인, 즉 지금까지 "가지 뻗기" 애니메이션이
  // 퍼진 범위의 간선만 보여줍니다 — 호버는 이 범위와 별개로 항상 추가로 동작합니다.
  // 라벨도 흐려진 간선에서는 숨겨서 뒤엉켜 보이는 걸 줄입니다. 등장 애니메이션 중에는 이 결과
  // 위에 다시 페이드인 알파를 곱합니다.
  edgeReducer: (
    edge: string,
    data: EdgeDisplayData,
    _attrs: EdgeAttributes,
    _state: unknown,
    _graphState: unknown,
    graph: Graph<NodeAttributes, EdgeAttributes>,
  ) => {
    const [source, target] = graph.extremities(edge)
    const isHovered =
      hoveredNodeId !== null && (source === hoveredNodeId || target === hoveredNodeId)
    const isRevealed =
      hopByNode !== null &&
      (() => {
        const sourceHop = hopByNode.get(source)
        const targetHop = hopByNode.get(target)
        return (
          sourceHop !== undefined &&
          targetHop !== undefined &&
          Math.max(sourceHop, targetHop) <= revealStep
        )
      })()
    const isHighlighted = isHovered || isRevealed
    const base = isHighlighted ? data : { ...data, color: DIMMED_EDGE_COLOR, label: undefined }
    if (appearProgress >= 1) return base
    return { ...base, color: withAlpha(base.color, appearProgress) }
  },
}

// WebGL로 그리는 부분만 따로 두어 필요할 때 불러옵니다(sigma는 WebGL이 없으면 불러올 때 실패합니다).
export default function SigmaCanvas({
  graph,
  evidenceDocumentIds,
  onNodeClick,
  onNodeHover,
  onReady,
}: {
  graph: Graph<NodeAttributes>
  /** 가장 최근 답변의 근거 문서. 바뀔 때마다 여기서부터 가지가 뻗어나가는 애니메이션을 다시 재생합니다. */
  evidenceDocumentIds: string[]
  onNodeClick: (documentId: string) => void
  onNodeHover: (hover: NodeHover | null) => void
  onReady: (sigma: Sigma) => void
}) {
  return (
    <SigmaContainer
      className="h-full w-full"
      // @react-sigma/core의 기본 CSS가 --sigma-background-color를 흰색(#fff)으로 깔아버려서
      // 우리 다크 배경·글로우가 다 가려졌습니다. 투명하게 덮어써서 뒤 배경이 보이게 합니다.
      style={{ '--sigma-background-color': 'transparent' } as CSSProperties}
      options={SIGMA_OPTIONS}
    >
      <GraphLoader graph={graph} />
      <GraphEvents onNodeClick={onNodeClick} onNodeHover={onNodeHover} onReady={onReady} />
      <HopReveal evidenceDocumentIds={evidenceDocumentIds} />
    </SigmaContainer>
  )
}

function GraphLoader({ graph }: { graph: Graph<NodeAttributes> }) {
  const loadGraph = useLoadGraph<NodeAttributes>()
  useEffect(() => {
    loadGraph(graph, true)
  }, [graph, loadGraph])
  return null
}

function GraphEvents({
  onNodeClick,
  onNodeHover,
  onReady,
}: {
  onNodeClick: (documentId: string) => void
  onNodeHover: (hover: NodeHover | null) => void
  onReady: (sigma: Sigma) => void
}) {
  const registerEvents = useRegisterEvents()
  const sigma = useSigma()

  useEffect(() => {
    liveGraph = sigma.getGraph() as unknown as Graph<NodeAttributes>
    hoveredNodeId = null
    playAppearAnimation(sigma)
    onReady(sigma)
    return () => {
      if (appearAnimationFrame !== null) {
        cancelAnimationFrame(appearAnimationFrame)
        appearAnimationFrame = null
      }
    }
  }, [sigma, onReady])

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => onNodeClick(node),
      enterNode: ({ node, event }) => {
        // 'grab'으로 눌러서 끌 수 있다는 걸 알려줍니다.
        sigma.getContainer().style.setProperty('cursor', 'grab')
        onNodeHover({ nodeId: node, x: event.x, y: event.y })
        hoveredNodeId = node
        sigma.refresh({ skipIndexation: true })
      },
      leaveNode: () => {
        sigma.getContainer().style.removeProperty('cursor')
        onNodeHover(null)
        hoveredNodeId = null
        sigma.refresh({ skipIndexation: true })
      },
      downNode: () => {
        sigma.getContainer().style.setProperty('cursor', 'grabbing')
      },
      // 툴팁은 노드에 들어온 순간의 위치에 고정돼 있어, 끌면 노드와 떨어져 허공에 남습니다.
      // 끌기 시작하면 숨기고, 놓은 뒤 다시 노드에 올리면 새 위치에서 다시 뜹니다.
      nodeDragStart: () => onNodeHover(null),
      upNode: () => {
        sigma.getContainer().style.setProperty('cursor', 'grab')
      },
    })
  }, [registerEvents, sigma, onNodeClick, onNodeHover])
  return null
}

/** GraphLoader 다음에 렌더돼야, 이 effect가 돌 때 sigma.getGraph()가 이미 새 그래프를 갖고 있습니다. */
function HopReveal({ evidenceDocumentIds }: { evidenceDocumentIds: string[] }) {
  const sigma = useSigma()

  useEffect(() => {
    playHopAnimation(
      sigma,
      sigma.getGraph() as unknown as Graph<NodeAttributes>,
      evidenceDocumentIds,
    )
    return () => clearHopAnimation()
  }, [sigma, evidenceDocumentIds])

  return null
}
