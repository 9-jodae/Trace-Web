import { Group, Panel, Separator } from 'react-resizable-panels'
import { useChatStore } from '@/features/ask-question'
import { ChatPanel } from '@/widgets/chat-panel'
import { DocumentGraph } from '@/widgets/document-graph'
import { EditorArea } from '@/widgets/editor-area'
import { HomeComposer } from '@/widgets/home-composer'
import { Sidebar } from '@/widgets/sidebar'

/**
 * 기획서의 메인 화면. 첫 질문 전에는 "01 홈"(가운데 큰 입력창), 질문을 보내면
 * "02 답변"(그래프·문서 탭 + 채팅)으로 바뀝니다. 둘 다 왼쪽 네비게이션은 공통입니다.
 */
export function WorkspacePage() {
  const hasConversation = useChatStore((state) => state.messages.length > 0)

  return (
    <div className="flex h-full bg-canvas text-ink">
      <Sidebar />
      {hasConversation ? (
        <Group orientation="horizontal" className="min-h-0 flex-1">
          <Panel defaultSize="63" minSize="30">
            <EditorArea graph={<DocumentGraph />} />
          </Panel>
          <Separator className="w-px bg-border-dark hover:bg-white/20" />
          <Panel defaultSize="37" minSize="24">
            <ChatPanel />
          </Panel>
        </Group>
      ) : (
        <div className="min-h-0 flex-1">
          <HomeComposer />
        </div>
      )}
    </div>
  )
}
