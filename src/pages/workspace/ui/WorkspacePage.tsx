import { Group, Panel, Separator } from 'react-resizable-panels'
import { LogoutButton } from '@/features/auth'
import { useMe } from '@/entities/user'
import { ChatPanel } from '@/widgets/chat-panel'
import { DocumentGraph } from '@/widgets/document-graph'
import { EditorArea } from '@/widgets/editor-area'

// 기획서의 메인 화면: 왼쪽은 그래프·문서 탭 영역, 오른쪽은 채팅 패널입니다.
export function WorkspacePage() {
  const { data: me } = useMe()

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-900">
      <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
        <h1 className="text-base font-semibold">docs199</h1>
        <div className="flex items-center gap-3 text-sm">
          {me && (
            <span className="text-slate-600">
              {me.department} · {me.name}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize="70" minSize="40" className="bg-white">
          <EditorArea graph={<DocumentGraph />} />
        </Panel>
        <Separator className="w-px bg-slate-200 hover:bg-slate-400" />
        <Panel defaultSize="30" minSize="20" className="bg-white">
          <ChatPanel />
        </Panel>
      </Group>
    </div>
  )
}
