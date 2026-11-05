import type { EdgeAttributes } from './buildGraph'

/**
 * 선을 보여 줄지 정합니다. 기본은 모두 숨기고, 질문하면 답변 근거 문서끼리의 관계 선만 보입니다.
 * 근거와 이웃 문서 사이 선은 그리지 않습니다.
 * 노드를 고르면 그 노드의 선만 모두 보이고, 마우스를 올린 노드의 선도 보입니다.
 */
export function isEdgeVisible({
  attributes,
  source,
  target,
  selectedNode,
  hoveredNode,
  drawingAnswer = false,
}: {
  attributes: Pick<EdgeAttributes, 'answer'>
  source: string
  target: string
  selectedNode: string | null
  hoveredNode: string | null
  /** 답변 선을 차례로 그리는 애니메이션 중이면 실제 답변 선은 끝난 뒤에 보입니다. */
  drawingAnswer?: boolean
}) {
  const touches = (node: string | null) => node !== null && (source === node || target === node)
  if (selectedNode !== null) return touches(selectedNode)
  if (touches(hoveredNode)) return true
  return attributes.answer === true && !drawingAnswer
}
