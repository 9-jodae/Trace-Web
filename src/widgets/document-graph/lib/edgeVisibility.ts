import type { EdgeAttributes } from './buildGraph'

/**
 * 선을 보여 줄지 정합니다. 기본은 모두 숨기고, 질문 답변의 근거에 닿는 선(근거 포커스)만 보입니다.
 * 노드를 고르면 그 노드의 선만 모두 보이고, 마우스를 올린 노드의 선도 보입니다.
 */
export function isEdgeVisible({
  attributes,
  source,
  target,
  selectedNode,
  hoveredNode,
}: {
  attributes: Pick<EdgeAttributes, 'focus'>
  source: string
  target: string
  selectedNode: string | null
  hoveredNode: string | null
}) {
  const touches = (node: string | null) => node !== null && (source === node || target === node)
  if (selectedNode !== null) return touches(selectedNode)
  if (touches(hoveredNode)) return true
  return attributes.focus === 'evidence' || attributes.focus === 'neighbor'
}
