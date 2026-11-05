import '@react-sigma/core/lib/style.css'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import type Graph from 'graphology'
import { DEFAULT_STYLES, type Sigma } from 'sigma'
import type { EdgeDisplayData, NodeDisplayData, SigmaOptions } from 'sigma/types'
import { useEffect, type CSSProperties } from 'react'
import {
  computeHoverRadialPositions,
  DIMMED_EDGE_COLOR,
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

// 사용자가 누른 노드. 고르면 그 노드의 선을 모두 보이고, 나머지는 대표 선만 흐리게 남깁니다.
let selectedNodeId: string | null = null

// 호버한 노드의 바로 이웃을 그 둘레에 임시로 모아 놓은 자리(그래프 좌표). 유형별 배치는 연결
// 관계를 모르고 정해져서 이웃이 화면 반대편에 있을 수 있어, 그 상태로 선만 밝히면 길게
// 가로지르며 다른 선과 교차해 보입니다. 호버가 끝나면(leaveNode) null로 돌려 원래 자리로
// 되돌립니다. computeHoverRadialPositions(buildGraph)가 실제 계산을 맡습니다.
let hoverRadialPositions: Map<string, { x: number; y: number }> | null = null

/** 1보다 작을수록 마우스를 움직인 거리보다 노드가 덜 움직입니다(끌기 민감도). */
const DRAG_DAMPING = 0.35

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

/** 대표 선 중 글자까지 보여 줄 선. 충돌·경고는 찾아다니지 않아도 바로 읽혀야 합니다. */
function alwaysLabeled(attributes: EdgeAttributes) {
  return attributes.warning === true || attributes.type === 'CONFLICTS'
}

/**
 * 선을 얼마나 보여 줄지 정합니다. 노드를 고르면 그 노드의 선만 모두 보이고 다른 대표 선은 흐립니다.
 * 고르지 않았을 때는 문서마다 대표 선 하나만 그리고, 마우스를 올린 노드의 선은 모두 보입니다.
 */
function visibleEdge(
  data: EdgeDisplayData,
  attributes: EdgeAttributes,
  source: string,
  target: string,
): EdgeDisplayData {
  const touches = (node: string | null) => node !== null && (source === node || target === node)
  const hidden = { ...data, visibility: 'hidden' as const, label: null }
  if (selectedNodeId !== null) {
    if (touches(selectedNodeId)) return data
    return attributes.primary ? { ...data, color: DIMMED_EDGE_COLOR, label: null } : hidden
  }
  if (touches(hoveredNodeId)) return data
  if (!attributes.primary) return hidden
  return alwaysLabeled(attributes) ? data : { ...data, label: null }
}

// 렌더마다 새 객체를 넘기면 sigma를 다시 만들어 그리는 중에 오류가 납니다. 한 번만 만듭니다.
// 명시적으로 SigmaOptions 타입을 붙여서, nodeReducer/edgeReducer를 settings 안에 잘못 넣는
// 것 같은 실수를 타입 체커가 잡게 합니다(실제로 그런 실수가 있었습니다).
const SIGMA_OPTIONS: Partial<SigmaOptions<NodeAttributes, EdgeAttributes>> = {
  // 라벨 글자색 기본값(검정)이 다크 배경에서 안 보여서 밝은 색으로 바꿉니다.
  // labelVisibility를 'auto' 고정해 호버 시에만 강제로 뜨는 기본 라벨도 없앱니다.
  styles: {
    nodes: [
      {
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
      // 근거 노드는 라벨을 항상 보여서 어떤 문서가 인용됐는지 바로 알 수 있게 합니다.
      {
        when: (attributes: { highlighted?: boolean }) => attributes.highlighted === true,
        then: { labelVisibility: 'visible', labelColor: '#ffffff' },
      },
    ],
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
        then: { labelColor: '#fca5a5' },
      },
      {
        when: (attributes: { warning?: boolean }) => attributes.warning === true,
        then: { labelColor: '#fca5a5' },
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
    // 선을 눌러 관계 내용을 봅니다.
    enableEdgeEvents: true,
    // 기본값(true)은 그릴 때마다 전체 노드 범위에 화면을 다시 맞춥니다. 노드 하나를 멀리 끌면
    // 범위가 넓어져 그래프 전체가 갑자기 확 작아졌습니다. 그래프를 새로 불러올 때(새 답변·필터 변경)
    // 한 번만 맞추고, 끄는 동안에는 배율을 그대로 둡니다.
    autoRescale: 'once',
    // 확대·축소 한도. 비율이 작을수록 확대입니다(0.1 = 10배 확대, 3 = 3배 축소).
    minCameraRatio: 0.1,
    maxCameraRatio: 3,
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
  // SigmaOptions 참고). settings 안에 넣으면 Settings 타입에 없는 키라 조용히 무시됩니다.
  // 등장 애니메이션 중에는 노드가 작고 투명하게 시작해 제 크기·색으로 커집니다.
  nodeReducer: (_node: string, data: NodeDisplayData) => {
    let base = data
    if (appearProgress < 1) {
      base = {
        ...base,
        size: base.size * appearProgress,
        color: withAlpha(base.color, appearProgress),
      }
    }
    // 호버한 노드의 이웃은 그 둘레에 바퀴살처럼 임시로 모아서, 유형별 배치가 연결 관계를 몰라
    // 이웃이 화면 반대편에 있는 바람에 강조된 선이 길게 가로지르며 교차해 보이는 걸 줄입니다.
    const radialPosition = hoverRadialPositions?.get(_node)
    if (radialPosition) {
      base = { ...base, x: radialPosition.x, y: radialPosition.y }
    }
    return base
  },
  // 선이 엉켜 보이지 않게 visibleEdge가 보여 줄 선을 고릅니다.
  // 등장 애니메이션 중에는 이 결과 위에 다시 페이드인 알파를 곱합니다.
  edgeReducer: (
    edge: string,
    data: EdgeDisplayData,
    attributes: EdgeAttributes,
    _state: unknown,
    _graphState: unknown,
    graph: Graph<NodeAttributes, EdgeAttributes>,
  ) => {
    const [source, target] = graph.extremities(edge)
    const base = visibleEdge(data, attributes, source, target)
    if (appearProgress >= 1) return base
    return { ...base, color: withAlpha(base.color, appearProgress) }
  },
}

// WebGL로 그리는 부분만 따로 두어 필요할 때 불러옵니다(sigma는 WebGL이 없으면 불러올 때 실패합니다).
export default function SigmaCanvas({
  graph,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onReady,
  onStageClick,
  selectedNode = null,
}: {
  graph: Graph<NodeAttributes>
  onNodeClick: (documentId: string) => void
  onEdgeClick?: (edge: string | null) => void
  onNodeHover: (hover: NodeHover | null) => void
  onReady: (sigma: Sigma) => void
  onStageClick?: () => void
  selectedNode?: string | null
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
      <GraphEvents
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeHover={onNodeHover}
        onReady={onReady}
        onStageClick={onStageClick}
      />
      <SelectedNode node={selectedNode} />
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

/** 고른 노드를 edgeReducer가 읽는 모듈 변수에 옮기고 다시 그립니다. */
function SelectedNode({ node }: { node: string | null }) {
  const sigma = useSigma()
  useEffect(() => {
    selectedNodeId = node
    sigma.refresh({ skipIndexation: true })
    return () => {
      selectedNodeId = null
    }
  }, [sigma, node])
  return null
}

function GraphEvents({
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onReady,
  onStageClick,
}: {
  onNodeClick: (documentId: string) => void
  onEdgeClick?: (edge: string | null) => void
  onNodeHover: (hover: NodeHover | null) => void
  onReady: (sigma: Sigma) => void
  onStageClick?: () => void
}) {
  const registerEvents = useRegisterEvents()
  const sigma = useSigma()

  useEffect(() => {
    liveGraph = sigma.getGraph() as unknown as Graph<NodeAttributes>
    hoveredNodeId = null
    hoverRadialPositions = null
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
      clickEdge: ({ edge }) => onEdgeClick?.(edge),
      clickStage: () => {
        onEdgeClick?.(null)
        onStageClick?.()
      },
      enterEdge: () => sigma.getContainer().style.setProperty('cursor', 'pointer'),
      leaveEdge: () => sigma.getContainer().style.removeProperty('cursor'),
      enterNode: ({ node, event }) => {
        // 'grab'으로 눌러서 끌 수 있다는 걸 알려줍니다.
        sigma.getContainer().style.setProperty('cursor', 'grab')
        onNodeHover({ nodeId: node, x: event.x, y: event.y })
        hoveredNodeId = node
        hoverRadialPositions = computeHoverRadialPositions(
          sigma.getGraph() as unknown as Graph<NodeAttributes>,
          node,
        )
        sigma.refresh({ skipIndexation: true })
      },
      leaveNode: () => {
        sigma.getContainer().style.removeProperty('cursor')
        onNodeHover(null)
        hoveredNodeId = null
        hoverRadialPositions = null
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
  }, [registerEvents, sigma, onNodeClick, onEdgeClick, onNodeHover, onStageClick])
  return null
}
