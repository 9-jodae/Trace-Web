import { create } from 'zustand'

export const GRAPH_TAB_ID = 'graph'

/** 동시에 열어 둘 수 있는 문서 탭 수. 기획서에서 미결정이라 임시값입니다. */
export const MAX_DOCUMENT_TABS = 10

export interface DocumentTab {
  documentId: string
  title: string
  /** 마지막으로 활성화된 순서. 탭이 넘칠 때 가장 오래 안 본 탭을 닫는 데 씁니다. */
  lastViewed: number
}

interface TabState {
  documentTabs: DocumentTab[]
  activeTabId: string
  sequence: number
  openDocument: (document: { documentId: string; title: string }) => void
  activateTab: (tabId: string) => void
  closeDocument: (documentId: string) => void
}

const initialState = {
  documentTabs: [] as DocumentTab[],
  activeTabId: GRAPH_TAB_ID,
  sequence: 0,
}

// 그래프 탭은 항상 첫 번째에 고정되고 닫을 수 없습니다. 문서 탭은 연 순서대로 쌓입니다.
export const useTabStore = create<TabState>()((set) => ({
  ...initialState,

  openDocument: ({ documentId, title }) =>
    set((state) => {
      const sequence = state.sequence + 1
      const existing = state.documentTabs.find((tab) => tab.documentId === documentId)
      if (existing) {
        return {
          sequence,
          activeTabId: documentId,
          documentTabs: state.documentTabs.map((tab) =>
            tab === existing ? { ...tab, lastViewed: sequence } : tab,
          ),
        }
      }

      let documentTabs = [...state.documentTabs, { documentId, title, lastViewed: sequence }]
      if (documentTabs.length > MAX_DOCUMENT_TABS) {
        const oldest = documentTabs.reduce((a, b) => (a.lastViewed <= b.lastViewed ? a : b))
        documentTabs = documentTabs.filter((tab) => tab !== oldest)
      }
      return { sequence, activeTabId: documentId, documentTabs }
    }),

  activateTab: (tabId) =>
    set((state) => {
      if (tabId === GRAPH_TAB_ID) return { activeTabId: GRAPH_TAB_ID }
      if (!state.documentTabs.some((tab) => tab.documentId === tabId)) return state
      const sequence = state.sequence + 1
      return {
        sequence,
        activeTabId: tabId,
        documentTabs: state.documentTabs.map((tab) =>
          tab.documentId === tabId ? { ...tab, lastViewed: sequence } : tab,
        ),
      }
    }),

  closeDocument: (documentId) =>
    set((state) => {
      const index = state.documentTabs.findIndex((tab) => tab.documentId === documentId)
      if (index < 0) return state
      const documentTabs = state.documentTabs.filter((tab) => tab.documentId !== documentId)
      if (state.activeTabId !== documentId) return { documentTabs }
      // 닫은 탭이 활성 탭이면 왼쪽 탭으로, 없으면 그래프 탭으로 이동합니다.
      const next = documentTabs[index - 1] ?? documentTabs[index]
      return { documentTabs, activeTabId: next?.documentId ?? GRAPH_TAB_ID }
    }),
}))

export function resetTabStore() {
  useTabStore.setState(initialState)
}
