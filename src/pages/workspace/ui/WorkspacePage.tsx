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

// 패널을 줄여도 글자가 잘리지 않을 최소 크기(px). 숫자는 픽셀, 문자열은 퍼센트입니다
const GRAPH_MIN_WIDTH = 360
const CHAT_MIN_WIDTH = 340
const PREVIEW_MIN_HEIGHT = 180
const CHAT_MIN_HEIGHT = 240

// 끌 수 있다는 걸 알 수 있게 잡는 영역을 넓히고, 마우스를 올리면 색을 바꿉니다
const verticalHandle =
  'w-1.5 cursor-col-resize bg-border-dark transition-colors hover:bg-blue-400/50 data-[separator=active]:bg-blue-400/70'
const horizontalHandle =
  'h-1.5 cursor-row-resize bg-border-dark transition-colors hover:bg-blue-400/50 data-[separator=active]:bg-blue-400/70'

/**
 * 메인 화면. 첫 질문 전에는 가운데 큰 입력창(HomeComposer)을, 질문을 보내면 그래프·문서 탭과
 * 채팅 화면을 보여 줍니다. 둘 다 왼쪽 네비게이션은 공통입니다.
 */
export function WorkspacePage() {
  const hasConversation = useChatStore((state) => state.messages.length > 0)

  return (
    <div className="flex h-full bg-canvas text-ink">
      <Sidebar />
      {hasConversation ? <AnswerLayout /> : <HomeComposer />}
    </div>
  )
}

function AnswerLayout() {
  return (
    <>
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize="63" minSize={GRAPH_MIN_WIDTH}>
          <EditorArea
            graph={<DocumentGraph />}
            renderDocument={(id) => <DocumentViewer key={id} documentId={id} />}
          />
        </Panel>
        <Separator className={verticalHandle} />
        <Panel defaultSize="37" minSize={CHAT_MIN_WIDTH}>
          <RightPanel />
        </Panel>
      </Group>
    </>
  )
}

/** 그래프에서 문서를 고르면 오른쪽 위에 문서를, 아래에 채팅을 보여 줍니다. */
function RightPanel() {
  const preview = useTabStore((state) => state.preview)
  if (!preview) return <ChatPanel />
  return (
    <Group orientation="vertical" className="h-full">
      <Panel defaultSize="55" minSize={PREVIEW_MIN_HEIGHT}>
        <PreviewPanel preview={preview} />
      </Panel>
      <Separator className={horizontalHandle} />
      <Panel defaultSize="45" minSize={CHAT_MIN_HEIGHT}>
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
