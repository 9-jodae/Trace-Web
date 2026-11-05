import { ExternalLink, X } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { useChatStore } from '@/features/ask-question'
import { useTabStore, type DocumentPreview } from '@/features/document-tabs'
import { ChatPanel } from '@/widgets/chat-panel'
import { DocumentGraph } from '@/widgets/document-graph'
import { DocumentViewer } from '@/widgets/document-viewer'
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
            <EditorArea
              graph={<DocumentGraph />}
              renderDocument={(id) => <DocumentViewer key={id} documentId={id} />}
            />
          </Panel>
          <Separator className="w-px bg-border-dark hover:bg-white/20" />
          <Panel defaultSize="37" minSize="24">
            <RightPanel />
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

/** 그래프에서 문서를 고르면 오른쪽 위에 문서를, 아래에 채팅을 보여 줍니다. */
function RightPanel() {
  const preview = useTabStore((state) => state.preview)
  if (!preview) return <ChatPanel />
  return (
    <Group orientation="vertical" className="h-full">
      <Panel defaultSize="55" minSize="20">
        <PreviewPanel preview={preview} />
      </Panel>
      <Separator className="h-px bg-border-dark hover:bg-white/20" />
      <Panel defaultSize="45" minSize="20">
        <ChatPanel />
      </Panel>
    </Group>
  )
}

function PreviewPanel({ preview }: { preview: DocumentPreview }) {
  const openDocument = useTabStore((state) => state.openDocument)
  const closePreview = useTabStore((state) => state.closePreview)
  return (
    <section aria-label="문서 미리보기" className="flex h-full min-h-0 flex-col bg-panel">
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border-dark pr-3 pl-6">
        <p className="truncate text-sm font-semibold text-ink">{preview.title}</p>
        <div className="flex items-center gap-2 text-ink-muted">
          <button
            type="button"
            aria-label="탭으로 열기"
            title="탭으로 열기"
            onClick={() => {
              openDocument(preview)
              closePreview()
            }}
            className="hover:text-ink"
          >
            <ExternalLink className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="미리보기 닫기"
            onClick={closePreview}
            className="hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <DocumentViewer key={preview.documentId} documentId={preview.documentId} />
      </div>
    </section>
  )
}
