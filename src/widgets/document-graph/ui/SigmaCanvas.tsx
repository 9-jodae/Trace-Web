import '@react-sigma/core/lib/style.css'
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core'
import type Graph from 'graphology'
import { useEffect } from 'react'
import type { NodeAttributes } from '../lib/buildGraph'

// WebGL로 그리는 부분만 따로 두어 필요할 때 불러옵니다(sigma는 WebGL이 없으면 불러올 때 실패합니다).
export default function SigmaCanvas({
  graph,
  onNodeClick,
}: {
  graph: Graph<NodeAttributes>
  onNodeClick: (documentId: string) => void
}) {
  return (
    <SigmaContainer
      className="h-full w-full"
      options={{ settings: { labelRenderedSizeThreshold: 8 } }}
    >
      <GraphLoader graph={graph} />
      <GraphEvents onNodeClick={onNodeClick} />
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

function GraphEvents({ onNodeClick }: { onNodeClick: (documentId: string) => void }) {
  const registerEvents = useRegisterEvents()
  const sigma = useSigma()
  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => onNodeClick(node),
      enterNode: () => sigma.getContainer().style.setProperty('cursor', 'pointer'),
      leaveNode: () => sigma.getContainer().style.removeProperty('cursor'),
    })
  }, [registerEvents, sigma, onNodeClick])
  return null
}
