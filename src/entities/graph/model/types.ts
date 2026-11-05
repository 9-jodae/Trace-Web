// docs199-Server의 GraphResponse(GET /api/graph, Issue #22, docs/graph-api.md)와 맞춥니다.

export type RelationType = 'REFERENCES' | 'CONFLICTS'

/** CONFLICTS 엣지에만 있습니다. thisValue는 source 쪽 값, otherValue는 target 쪽 값입니다. */
export interface GraphConflictDetail {
  item: string
  thisValue: string
  otherValue: string
}

export interface GraphOwnerDepartment {
  id: string
  name: string
}

export interface GraphNode {
  id: string
  title: string
  documentType: string | null
  ownerDepartment: GraphOwnerDepartment | null
  clearance: string
  currentVersion: number
  versionCount: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: RelationType
  /** type에서 고정으로 계산되는 표시용 문자열("참조"/"충돌"). */
  label: string
  detail: GraphConflictDetail | null
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/** depth는 documentId와 함께만 쓸 수 있고 1 또는 2만 허용됩니다. */
export interface GraphParams {
  documentId?: string
  depth?: 1 | 2
}
