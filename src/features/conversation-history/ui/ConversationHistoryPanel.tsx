import { ArrowLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { useConversations, type ConversationSummary } from '@/entities/conversation'

/** 오늘 기준 자정과 비교한 날짜 차이. 같은 날이면 0. */
function daysAgo(dateString: string) {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.floor((startOfDay(new Date()) - startOfDay(new Date(dateString))) / 86_400_000)
}

function formatTimestamp(dateString: string, isToday: boolean) {
  const date = new Date(dateString)
  return isToday
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function groupByRecency(conversations: ConversationSummary[]) {
  const groups = {
    오늘: [] as ConversationSummary[],
    '지난 7일': [] as ConversationSummary[],
    이전: [] as ConversationSummary[],
  }
  for (const conversation of conversations) {
    const age = daysAgo(conversation.updatedAt)
    if (age <= 0) groups['오늘'].push(conversation)
    else if (age <= 7) groups['지난 7일'].push(conversation)
    else groups['이전'].push(conversation)
  }
  return groups
}

/**
 * 채팅 패널의 "대화 기록" 화면(와이어프레임 14번). 목록은 서버가 이미 최근 갱신순으로 주므로
 * 그대로 날짜대만 나눠서 보여줍니다. "근거 N"개 표시는 대화 목록 API에 그 값이 없어(상세를
 * 전부 조회해야 함) 뺐습니다.
 */
export function ConversationHistoryPanel({
  onSelect,
  onNewConversation,
  onBack,
  selecting,
}: {
  onSelect: (conversationId: string) => void
  onNewConversation: () => void
  onBack: () => void
  selecting: boolean
}) {
  const { data: conversations = [], isPending, error } = useConversations()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? conversations.filter((conversation) => conversation.title.includes(query.trim()))
    : conversations
  const groups = groupByRecency(filtered)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border-dark pr-3 pl-6">
        <p className="text-sm font-semibold text-ink">대화 기록</p>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-ink-dim hover:bg-white/5 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          채팅
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={onNewConversation}
          className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-ink text-sm font-medium text-[#111110]"
        >
          <Plus className="size-4" aria-hidden />새 대화
        </button>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="대화 검색"
          aria-label="대화 검색"
          className="h-9 rounded-lg border border-border-dark-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isPending && <p className="px-2 text-sm text-ink-muted">불러오는 중…</p>}
        {error && <p className="px-2 text-sm text-red-300">대화 목록을 불러오지 못했습니다.</p>}
        {!isPending &&
          !error &&
          (Object.entries(groups) as [string, ConversationSummary[]][]).map(
            ([label, items]) =>
              items.length > 0 && (
                <div key={label} className="mb-2">
                  <p className="px-2 pt-2 pb-1 text-xs font-medium text-ink-muted">{label}</p>
                  {items.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      disabled={selecting}
                      onClick={() => onSelect(conversation.id)}
                      className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2.5 text-left hover:bg-white/5 disabled:opacity-50"
                    >
                      <span className="truncate text-sm text-ink">{conversation.title}</span>
                      <span className="text-xs text-ink-muted">
                        {formatTimestamp(conversation.updatedAt, label === '오늘')}
                      </span>
                    </button>
                  ))}
                </div>
              ),
          )}
        {!isPending && !error && conversations.length === 0 && (
          <p className="px-2 text-sm text-ink-muted">대화 기록이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
