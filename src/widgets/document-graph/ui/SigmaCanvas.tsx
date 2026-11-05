import '@react-sigma/core/lib/style.css'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import type Graph from 'graphology'
import { DEFAULT_STYLES, type Sigma } from 'sigma'
import { useEffect, type CSSProperties } from 'react'
import type { NodeAttributes } from '../lib/buildGraph'

export interface NodeHover {
  nodeId: string
  /** 컨테이너 기준 픽셀 좌표. 툴팁을 그 옆에 띄우는 데 씁니다. */
  x: number
  y: number
}

// 렌더마다 새 객체를 넘기면 sigma를 다시 만들어 그리는 중에 오류가 납니다. 한 번만 만듭니다.
const SIGMA_OPTIONS = {
  // 라벨 글자색 기본값(검정)이 다크 배경에서 안 보여서 밝은 색으로 바꿉니다.
  // backdrop(호버 시 뜨는 흰 알약 배경)도 꺼서 우리가 직접 그리는 HoverTooltip과 안 겹치게 합니다.
  // labelVisibility를 'auto' 고정해 호버 시에만 강제로 뜨는 기본 라벨도 없앱니다.
  styles: {
    nodes: [
      {
        ...DEFAULT_STYLES.nodes,
        labelColor: '#e8edf5',
        labelVisibility: 'auto',
        backdropVisibility: 'hidden',
      },
      // 근거 포커스(buildGraph의 applyEvidenceFocus): 근거와 직접 연결 노드는 라벨을 항상 보이고,
      // 흐린 노드는 라벨을 숨겨 화면에 남는 글자를 근거 주변으로 좁힙니다.
      {
        whenData: { focus: 'evidence' },
        then: { labelVisibility: 'visible', labelColor: '#ffffff' },
      },
      {
        whenData: { focus: 'neighbor' },
        then: { labelVisibility: 'visible', labelColor: '#cbd5e1' },
      },
      { whenData: { focus: 'dimmed' }, then: { labelVisibility: 'hidden' } },
      // 흐린 노드에 마우스를 올리면 원래 유형 색을 반쯤 되살려 어떤 문서인지 가늠하게 합니다.
      {
        when: (attributes: { focus?: string }, state: { isHovered: boolean }) =>
          attributes.focus === 'dimmed' && state.isHovered,
        then: { color: { attribute: 'baseColor' }, opacity: 0.6 },
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
        then: { labelColor: '#fb923c' },
      },
      {
        when: (attributes: { type?: string }) => attributes.type === 'REFERENCES',
        then: { labelColor: '#93c5fd' },
      },
      // 근거에 닿지 않는 선은 관계 글자를 숨깁니다(색·굵기는 buildGraph가 이미 흐리게 정함).
      { whenData: { focus: 'dimmed' }, then: { labelVisibility: 'hidden' } },
    ],
  },
  settings: {
    // 임계값을 높여 한 화면에 라벨이 한꺼번에 너무 많이 떠서 겹치는 걸 줄입니다.
    labelRenderedSizeThreshold: 16,
    // 노드를 누른 채로 끌면 위치가 바뀌게 합니다(x/y 속성에 직접 반영됨).
    enableNodeDrag: true,
    renderEdgeLabels: true,
    // 기본값(true)은 그릴 때마다 전체 노드 범위에 화면을 다시 맞춥니다. 노드 하나를 멀리 끌면
    // 범위가 넓어져 그래프 전체가 갑자기 확 작아졌습니다. 그래프를 새로 불러올 때(새 답변·필터 변경)
    // 한 번만 맞추고, 끄는 동안에는 배율을 그대로 둡니다.
    autoRescale: 'once',
    // 확대·축소 한도. 비율이 작을수록 확대입니다(0.1 = 10배 확대, 3 = 3배 축소).
    minCameraRatio: 0.1,
    maxCameraRatio: 3,
  },
}

// WebGL로 그리는 부분만 따로 두어 필요할 때 불러옵니다(sigma는 WebGL이 없으면 불러올 때 실패합니다).
export default function SigmaCanvas({
  graph,
  onNodeClick,
  onNodeHover,
  onReady,
}: {
  graph: Graph<NodeAttributes>
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
      options={SIGMA_OPTIONS as never}
    >
      <GraphLoader graph={graph} />
      <GraphEvents onNodeClick={onNodeClick} onNodeHover={onNodeHover} onReady={onReady} />
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
    onReady(sigma)
  }, [sigma, onReady])

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => onNodeClick(node),
      enterNode: ({ node, event }) => {
        // 'grab'으로 눌러서 끌 수 있다는 걸 알려줍니다.
        sigma.getContainer().style.setProperty('cursor', 'grab')
        onNodeHover({ nodeId: node, x: event.x, y: event.y })
      },
      leaveNode: () => {
        sigma.getContainer().style.removeProperty('cursor')
        onNodeHover(null)
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
