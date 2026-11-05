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
      options={{
        // 라벨 글자색 기본값(검정)이 다크 배경에서 안 보여서 밝은 색으로 바꿉니다.
        // backdrop(호버 시 뜨는 흰 알약 배경)도 꺼서 우리가 직접 그리는 HoverTooltip과 안 겹치게 합니다.
        // labelVisibility를 'auto' 고정해 호버 시에만 강제로 뜨는 기본 라벨도 없앱니다.
        styles: {
          nodes: {
            ...DEFAULT_STYLES.nodes,
            labelColor: '#e8edf5',
            labelVisibility: 'auto',
            backdropVisibility: 'hidden',
          },
        },
        settings: {
          // 임계값을 높여 한 화면에 라벨이 한꺼번에 너무 많이 떠서 겹치는 걸 줄입니다.
          labelRenderedSizeThreshold: 16,
          // 노드를 누른 채로 끌면 위치가 바뀌게 합니다(x/y 속성에 직접 반영됨).
          enableNodeDrag: true,
        },
      }}
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
      upNode: () => {
        sigma.getContainer().style.setProperty('cursor', 'grab')
      },
    })
  }, [registerEvents, sigma, onNodeClick, onNodeHover])
  return null
}
