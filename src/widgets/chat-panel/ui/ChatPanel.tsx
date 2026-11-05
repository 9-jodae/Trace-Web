import { ChatView, GraphHighlightToggle } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'
import { toQuestionFilters, useDocumentFilterStore } from '@/features/filter-documents'

/** 오른쪽 채팅 패널: 질문 입력과 근거가 달린 답변을 보여줍니다. */
export function ChatPanel() {
  const openDocument = useTabStore((state) => state.openDocument)
  const filter = useDocumentFilterStore((state) => state.filter)

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-dark pr-3 pl-6">
        <p className="text-sm font-semibold text-ink">채팅</p>
        <GraphHighlightToggle />
      </div>
      {/* 근거를 누르면 해당 문서 탭을 열고 근거 청크를 표시합니다. */}
      <ChatView
        filters={toQuestionFilters(filter)}
        onOpenSource={(source, highlights) =>
          openDocument({
            documentId: source.documentId,
            title: source.documentTitle,
            chunkId: source.id,
            highlights,
          })
        }
        onClearFilters={() => useDocumentFilterStore.getState().reset()}
      />
    </div>
  )
}
