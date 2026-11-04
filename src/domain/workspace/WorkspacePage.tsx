import { Group, Panel, Separator } from 'react-resizable-panels'
import { TabBar } from '@/domain/workspace/TabBar'
import { GRAPH_TAB_ID, useTabStore } from '@/domain/workspace/tabStore'

// 기획서의 메인 화면: 왼쪽은 그래프·문서 탭 영역, 오른쪽은 채팅 패널입니다.
export function WorkspacePage() {
  const activeTabId = useTabStore((state) => state.activeTabId)

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <header className="flex h-12 items-center border-b border-slate-200 bg-white px-4">
        <h1 className="text-base font-semibold">docs199</h1>
      </header>
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize="70" minSize="40" className="flex flex-col bg-white">
          <TabBar />
          <section className="flex flex-1 items-center justify-center text-sm text-slate-400">
            {activeTabId === GRAPH_TAB_ID
              ? '문서 관계 그래프 (구현 예정)'
              : '원문 뷰어 (구현 예정)'}
          </section>
        </Panel>
        <Separator className="w-px bg-slate-200 hover:bg-slate-400" />
        <Panel defaultSize="30" minSize="20" className="flex flex-col bg-white">
          <div className="flex h-10 items-center border-b border-slate-200 px-4 text-sm font-medium">
            채팅
          </div>
          <section className="flex flex-1 items-center justify-center text-sm text-slate-400">
            채팅 패널 (구현 예정)
          </section>
        </Panel>
      </Group>
    </div>
  )
}
