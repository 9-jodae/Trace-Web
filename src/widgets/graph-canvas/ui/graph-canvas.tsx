import { useDocumentGraph } from '@/features/explore-graph'

/** TODO: react-force-graph 또는 Cytoscape.js로 교체. 노드에는 문서 제목만 표시 */
export function GraphCanvas({ documentIds }: { documentIds: string[] }) {
  const { data } = useDocumentGraph(documentIds)
  if (!data) return null
  return (
    <ul>
      {data.nodes.map((n) => (
        <li key={n.id}>{n.title}</li>
      ))}
    </ul>
  )
}
