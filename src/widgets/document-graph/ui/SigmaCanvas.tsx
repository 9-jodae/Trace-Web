import '@react-sigma/core/lib/style.css'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import type Graph from 'graphology'
import type { Sigma } from 'sigma'
import { useEffect } from 'react'
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
      options={{ settings: { labelRenderedSizeThreshold: 8 } }}
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
        sigma.getContainer().style.setProperty('cursor', 'pointer')
        onNodeHover({ nodeId: node, x: event.x, y: event.y })
      },
      leaveNode: () => {
        sigma.getContainer().style.removeProperty('cursor')
        onNodeHover(null)
      },
    })
  }, [registerEvents, sigma, onNodeClick, onNodeHover])
  return null
}
