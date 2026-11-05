import { describe, expect, it } from 'vitest'
import { isEdgeVisible } from './edgeVisibility'

const edge = (answer: boolean) => ({
  attributes: { answer },
  source: 'a',
  target: 'b',
  selectedNode: null,
  hoveredNode: null,
})

describe('isEdgeVisible', () => {
  it('질문 전에는 선을 보이지 않는다', () => {
    expect(isEdgeVisible(edge(false))).toBe(false)
  })

  it('답변 근거 문서끼리의 선만 보인다', () => {
    expect(isEdgeVisible(edge(true))).toBe(true)
    // 근거와 이웃 사이 선, 근거 밖 경고 선도 그리지 않는다
    expect(isEdgeVisible(edge(false))).toBe(false)
  })

  it('노드를 고르면 그 노드의 선만 보인다', () => {
    expect(isEdgeVisible({ ...edge(false), selectedNode: 'a' })).toBe(true)
    expect(isEdgeVisible({ ...edge(true), selectedNode: 'c' })).toBe(false)
  })

  it('마우스를 올린 노드의 선은 보인다', () => {
    expect(isEdgeVisible({ ...edge(false), hoveredNode: 'b' })).toBe(true)
  })
})
