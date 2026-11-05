import { ChatView, NewConversationButton } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'

/** 오른쪽 채팅 패널: 질문 입력과 근거가 달린 답변을 보여줍니다. */
export function ChatPanel() {
  const openDocument = useTabStore((state) => state.openDocument)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center justify-between border-b border-slate-200 px-4 text-sm font-medium">
        채팅
        <NewConversationButton />
      </div>
      {/* 근거를 누르면 해당 문서 탭을 엽니다. 원문 하이라이트는 결정 후 구현합니다. */}
      <ChatView
        onOpenSource={(source) =>
          openDocument({ documentId: source.documentId, title: source.documentTitle })
        }
      />
    </div>
  )
}
