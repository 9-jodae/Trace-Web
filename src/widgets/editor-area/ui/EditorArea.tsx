import type { ReactNode } from 'react'
import { GRAPH_TAB_ID, TabBar, useTabStore } from '@/features/document-tabs'

/**
 * 왼쪽 탭 영역: 고정된 그래프 탭과 문서 탭을 전환해 보여줍니다.
 * 그래프는 다른 위젯이므로 페이지가 넣어 줍니다.
 */
export function EditorArea({ graph }: { graph: ReactNode }) {
  const activeTabId = useTabStore((state) => state.activeTabId)

  return (
    <div className="flex h-full flex-col">
      <TabBar />
      <section className="min-h-0 flex-1">
        {activeTabId === GRAPH_TAB_ID ? (
          graph
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            원문 보기와 근거 하이라이트는 표시 방식이 정해진 뒤 구현합니다.
          </p>
        )}
      </section>
    </div>
  )
}
