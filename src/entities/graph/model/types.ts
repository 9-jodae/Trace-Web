import type { DocumentType } from '@/shared/config'

export interface GraphNode {
  id: string // documentId
  title: string // 노드에는 제목만 표시
  type: DocumentType
}

export interface GraphEdge {
  source: string
  target: string
  relation: 'reference' | 'similar' | 'same_project'
  weight: number
}

export interface DocumentGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
