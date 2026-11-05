import type { ReactNode } from 'react'
import { GRAPH_TAB_ID, TabBar, useTabStore } from '@/features/document-tabs'

/**
 * 왼쪽 탭 영역: 고정된 그래프 탭과 문서 탭을 전환해 보여줍니다.
 * 그래프와 문서 뷰어는 다른 위젯이므로 페이지가 넣어 줍니다.
 */
export function EditorArea({
  graph,
  renderDocument,
}: {
  graph: ReactNode
  renderDocument: (documentId: string) => ReactNode
}) {
  const activeTabId = useTabStore((state) => state.activeTabId)

  return (
    <div className="flex h-full flex-col bg-surface">
      <TabBar />
      <section className="min-h-0 flex-1">
        {activeTabId === GRAPH_TAB_ID ? graph : renderDocument(activeTabId)}
      </section>
    </div>
  )
}
