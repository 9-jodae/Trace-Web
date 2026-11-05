import { GRAPH_TAB_ID, TabBar, useTabStore } from '@/features/document-tabs'

/** 왼쪽 탭 영역: 고정된 그래프 탭과 문서 탭을 전환해 보여줍니다. */
export function EditorArea() {
  const activeTabId = useTabStore((state) => state.activeTabId)

  return (
    <div className="flex h-full flex-col">
      <TabBar />
      <section className="flex flex-1 items-center justify-center text-sm text-slate-400">
        {activeTabId === GRAPH_TAB_ID
          ? '문서 관계 그래프 (구현 예정)'
          : '원문 보기와 근거 하이라이트는 표시 방식이 정해진 뒤 구현합니다.'}
      </section>
    </div>
  )
}
