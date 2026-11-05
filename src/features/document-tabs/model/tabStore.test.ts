import { beforeEach, describe, expect, it } from 'vitest'
import { GRAPH_TAB_ID, MAX_DOCUMENT_TABS, resetTabStore, useTabStore } from './tabStore'

const open = (id: string, chunkId?: string) =>
  useTabStore.getState().openDocument({ documentId: id, title: id, chunkId })
const ids = () => useTabStore.getState().documentTabs.map((tab) => tab.documentId)
const tabOf = (id: string) =>
  useTabStore.getState().documentTabs.find((tab) => tab.documentId === id)

describe('tabStore', () => {
  beforeEach(() => {
    resetTabStore()
  })

  it('처음에는 그래프 탭만 활성화되어 있다', () => {
    expect(useTabStore.getState().activeTabId).toBe(GRAPH_TAB_ID)
    expect(ids()).toEqual([])
  })

  it('문서를 열면 새 탭을 만들고 활성화한다', () => {
    open('a')
    open('b')
    expect(ids()).toEqual(['a', 'b'])
    expect(useTabStore.getState().activeTabId).toBe('b')
  })

  it('이미 열린 문서를 다시 열면 새 탭 없이 기존 탭으로 이동한다', () => {
    open('a')
    open('b')
    open('a')
    expect(ids()).toEqual(['a', 'b'])
    expect(useTabStore.getState().activeTabId).toBe('a')
  })

  it('탭이 최대 개수를 넘으면 가장 오래 안 본 탭을 닫는다', () => {
    for (let i = 0; i < MAX_DOCUMENT_TABS; i++) open(`d${i}`)
    useTabStore.getState().activateTab('d0')
    open('new')
    expect(ids()).toHaveLength(MAX_DOCUMENT_TABS)
    expect(ids()).toContain('d0')
    expect(ids()).not.toContain('d1')
  })

  it('활성 탭을 닫으면 왼쪽 탭, 없으면 그래프 탭으로 이동한다', () => {
    open('a')
    open('b')
    useTabStore.getState().closeDocument('b')
    expect(useTabStore.getState().activeTabId).toBe('a')
    useTabStore.getState().closeDocument('a')
    expect(useTabStore.getState().activeTabId).toBe(GRAPH_TAB_ID)
  })

  it('비활성 탭을 닫으면 활성 탭은 그대로다', () => {
    open('a')
    open('b')
    useTabStore.getState().closeDocument('a')
    expect(useTabStore.getState().activeTabId).toBe('b')
  })

  it('인용으로 문서를 열면 새 탭에 focusChunkId를 저장한다', () => {
    open('a', 'chunk-1')
    expect(tabOf('a')?.focusChunkId).toBe('chunk-1')
    expect(useTabStore.getState().activeTabId).toBe('a')
  })

  it('같은 문서의 다른 인용을 열면 새 탭 없이 focusChunkId만 바꾸고 활성화한다', () => {
    open('a', 'chunk-1')
    open('b')
    open('a', 'chunk-2')
    expect(ids()).toEqual(['a', 'b'])
    expect(useTabStore.getState().activeTabId).toBe('a')
    expect(tabOf('a')?.focusChunkId).toBe('chunk-2')
  })

  it('그래프 노드처럼 chunkId 없이 같은 문서를 열면 근거 영역을 닫는다', () => {
    open('a', 'chunk-1')
    open('a')
    expect(tabOf('a')?.focusChunkId).toBeUndefined()
  })

  it('closeEvidence를 호출하면 해당 문서 탭의 focusChunkId만 지운다', () => {
    open('a', 'chunk-1')
    open('b', 'chunk-2')
    useTabStore.getState().closeEvidence('a')
    expect(tabOf('a')?.focusChunkId).toBeUndefined()
    expect(tabOf('b')?.focusChunkId).toBe('chunk-2')
    expect(ids()).toEqual(['a', 'b'])
  })
})
