import { ChatView, useChatStore } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'

/** 오른쪽 채팅 패널: 질문 입력과 근거가 달린 답변을 보여줍니다. */
export function ChatPanel() {
  const openDocument = useTabStore((state) => state.openDocument)

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-dark pr-3 pl-6">
        <p className="text-sm font-semibold text-ink">채팅</p>
        <GraphHighlightToggle />
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

/** 꺼두면 근거 강조를 그래프에 반영하지 않습니다(기획서 디자인의 "관계 그래프" 토글). */
function GraphHighlightToggle() {
  const enabled = useChatStore((state) => state.graphHighlightEnabled)
  const toggle = useChatStore((state) => state.toggleGraphHighlight)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className="flex h-11 items-center gap-2.5 rounded-[22px] px-2.5 text-[13px] text-ink-dim hover:bg-white/5"
    >
      <span
        className={`relative h-5 w-[34px] rounded-full transition-colors ${enabled ? 'bg-ink' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-[#111110] transition-transform ${
            enabled ? 'translate-x-[16px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      관계 그래프
    </button>
  )
}
