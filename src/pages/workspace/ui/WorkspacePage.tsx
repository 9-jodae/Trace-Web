import { Group, Panel, Separator } from 'react-resizable-panels'
import { ChatPanel } from '@/widgets/chat-panel'
import { DocumentGraph } from '@/widgets/document-graph'
import { EditorArea } from '@/widgets/editor-area'
import { Sidebar } from '@/widgets/sidebar'

// 기획서의 메인 화면: 왼쪽 네비게이션, 가운데 그래프·문서 탭, 오른쪽 채팅 패널입니다.
export function WorkspacePage() {
  return (
    <div className="flex h-full bg-canvas text-ink">
      <Sidebar />
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize="63" minSize="30">
          <EditorArea graph={<DocumentGraph />} />
        </Panel>
        <Separator className="w-px bg-border-dark hover:bg-white/20" />
        <Panel defaultSize="37" minSize="24">
          <ChatPanel />
        </Panel>
      </Group>
    </div>
  )
}
