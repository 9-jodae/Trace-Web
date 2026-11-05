import type { GraphEdge } from '@/entities/graph'
import type { ModifiedDocument } from './buildGraph'

export type EdgeDetailItem =
  | { kind: 'CONFLICT'; item: string; values: { title: string; value: string }[] }
  | { kind: 'MODIFIED'; modifiedTitle: string; referrerTitle: string }
  | { kind: 'REFERENCE'; fromTitle: string; toTitle: string }
  | { kind: 'TOPIC'; topics: string[] }

/** 간선을 눌렀을 때 보여 줄 내용. 위험한 관계부터 앞에 둡니다. */
export function describeEdge({
  source,
  target,
  edges,
  titleOf,
  modifiedDocuments = [],
  resolvedDocumentIds = [],
}: {
  source: string
  target: string
  edges: GraphEdge[]
  titleOf: (documentId: string) => string
  modifiedDocuments?: ModifiedDocument[]
  resolvedDocumentIds?: string[]
}): EdgeDetailItem[] {
  const pair = edges.filter(
    (edge) =>
      (edge.source === source && edge.target === target) ||
      (edge.source === target && edge.target === source),
  )
  const items: EdgeDetailItem[] = []
  for (const edge of pair) {
    const resolved =
      resolvedDocumentIds.includes(edge.source) || resolvedDocumentIds.includes(edge.target)
    if (edge.type !== 'CONFLICTS' || resolved) continue
    const detail = edge.detail && 'item' in edge.detail ? edge.detail : null
    if (!detail) continue
    items.push({
      kind: 'CONFLICT',
      item: detail.item,
      values: [
        { title: titleOf(edge.source), value: detail.thisValue },
        { title: titleOf(edge.target), value: detail.otherValue },
      ],
    })
  }
  for (const edge of pair) {
    if (edge.type !== 'REFERENCES') continue
    const modified = modifiedDocuments.find((document) => document.id === edge.target)
    if (modified) {
      items.push({
        kind: 'MODIFIED',
        modifiedTitle: modified.title,
        referrerTitle: titleOf(edge.source),
      })
    }
  }
  for (const edge of pair) {
    if (edge.type === 'TOPIC' && edge.detail && 'topics' in edge.detail) {
      items.push({ kind: 'TOPIC', topics: edge.detail.topics })
    }
  }
  for (const edge of pair) {
    if (edge.type === 'REFERENCES') {
      items.push({
        kind: 'REFERENCE',
        fromTitle: titleOf(edge.source),
        toTitle: titleOf(edge.target),
      })
    }
  }
  return items
}
