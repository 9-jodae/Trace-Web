import { useConversations } from '@/entities/conversation'
import { DeleteConversationButton } from './DeleteConversationButton'

/** 사이드바에 보여줄 최근 대화 수. 전체 목록은 채팅 패널의 "대화 기록"에서 봅니다. */
const RECENT_LIMIT = 10

/**
 * 사이드바의 "최근 질문": 서버에 저장된 내 대화를 최근 갱신순으로 보여주고, 고르면 다시 불러옵니다.
 * 목록은 서버가 이미 최근 갱신순으로 줍니다.
 */
export function RecentConversations({
  activeConversationId,
  onSelect,
  onDeleted,
  disabled,
}: {
  activeConversationId: string | null
  onSelect: (conversationId: string) => void
  /** 대화를 지운 뒤 불립니다. 지금 열린 대화였다면 채팅을 비우는 일은 호출한 쪽이 합니다. */
  onDeleted: (conversationId: string) => void
  disabled: boolean
}) {
  const { data: conversations = [], error } = useConversations()

  if (error) {
    return (
      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1.5 text-xs font-medium text-ink-muted">최근 질문</p>
        <p className="px-3 text-xs text-red-300">대화 목록을 불러오지 못했습니다.</p>
      </div>
    )
  }
  if (conversations.length === 0) return null

  return (
    <nav aria-label="최근 질문" className="flex min-h-0 flex-col gap-0.5">
      <p className="px-3 pb-1.5 text-xs font-medium text-ink-muted">최근 질문</p>
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {conversations.slice(0, RECENT_LIMIT).map((conversation) => {
          const active = conversation.id === activeConversationId
          return (
            <li
              key={conversation.id}
              className={`group flex items-center rounded-lg pr-1 ${
                active ? 'bg-white/[0.06]' : 'hover:bg-white/5'
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(conversation.id)}
                className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-[13px] disabled:opacity-50 ${
                  active ? 'text-white' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {conversation.title}
              </button>
              <DeleteConversationButton
                conversationId={conversation.id}
                title={conversation.title}
                disabled={disabled}
                onDeleted={onDeleted}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
