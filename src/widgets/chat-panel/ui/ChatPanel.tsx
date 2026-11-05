import { History } from 'lucide-react'
import { useState } from 'react'
import { ChatView, GraphHighlightToggle, useChatStore } from '@/features/ask-question'
import { ConversationHistoryPanel, useOpenConversation } from '@/features/conversation-history'
import { useTabStore } from '@/features/document-tabs'
import { toQuestionFilters, useDocumentFilterStore } from '@/features/filter-documents'

/** 오른쪽 채팅 패널: 질문 입력과 근거가 달린 답변, 또는 대화 기록 목록을 보여줍니다. */
export function ChatPanel() {
  const openDocument = useTabStore((state) => state.openDocument)
  const filter = useDocumentFilterStore((state) => state.filter)
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const { open, isLoading } = useOpenConversation()
  const [openError, setOpenError] = useState(false)

  if (view === 'history') {
    return (
      <div className="flex h-full flex-col bg-panel">
        <ConversationHistoryPanel
          selecting={isLoading}
          onBack={() => {
            setOpenError(false)
            setView('chat')
          }}
          onNewConversation={() => {
            setOpenError(false)
            useChatStore.getState().startNewConversation()
            setView('chat')
          }}
          onSelect={async (conversationId) => {
            setOpenError(false)
            try {
              const messages = await open(conversationId)
              if (!messages) return
              useChatStore.getState().loadConversation(conversationId, messages)
              setView('chat')
            } catch {
              setOpenError(true)
            }
          }}
        />
        {openError && (
          <p role="alert" className="px-6 pb-4 text-xs text-red-300">
            대화를 불러오지 못했습니다.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-dark pr-3 pl-6">
        <p className="text-sm font-semibold text-ink">채팅</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="대화 기록"
            onClick={() => setView('history')}
            className="flex size-9 items-center justify-center rounded-md text-ink-dim hover:bg-white/5 hover:text-ink"
          >
            <History className="size-4" aria-hidden />
          </button>
          <GraphHighlightToggle />
        </div>
      </div>
      {/* 근거를 누르면 해당 문서 탭을 열고 근거 청크를 표시합니다. */}
      <ChatView
        filters={toQuestionFilters(filter)}
        onOpenSource={(source) =>
          openDocument({
            documentId: source.documentId,
            title: source.documentTitle,
            chunkId: source.id,
          })
        }
        onClearFilters={() => useDocumentFilterStore.getState().reset()}
      />
    </div>
  )
}
