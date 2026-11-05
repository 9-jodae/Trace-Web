import { FolderOpen, MessageCircle, Plus } from 'lucide-react'
import { LogoutButton } from '@/features/auth'
import { useChatStore, useIsAsking } from '@/features/ask-question'
import { GRAPH_TAB_ID, useTabStore } from '@/features/document-tabs'
import { useMe } from '@/entities/user'
import logo from './assets/logo.svg'

/**
 * 왼쪽 네비게이션. "문서 관리"는 관리자 기능이 아직 기획되지 않아 비활성 상태로만 둡니다.
 * "최근 질문"은 대화 기록 화면이 결정되기 전까지 이번 세션에서 주고받은 질문만 보여줍니다.
 */
export function Sidebar() {
  const { data: me } = useMe()

  return (
    <aside className="flex h-full w-[249px] shrink-0 flex-col gap-6 bg-panel px-4 py-5">
      <div className="flex items-center gap-3 px-1 py-0.5">
        <img src={logo} alt="" className="size-9" />
        <p className="text-[17px] font-semibold tracking-tight text-ink">문서119</p>
      </div>

      <NewQuestionButton />

      <nav className="flex flex-col gap-0.5">
        <span className="flex h-11 items-center gap-2.5 rounded-[10px] bg-white/10 px-3 text-sm font-medium text-white">
          <MessageCircle className="size-[18px]" aria-hidden />
          질문하기
        </span>
        <button
          type="button"
          disabled
          title="관리자 화면은 기획이 확정되면 추가합니다"
          className="flex h-11 cursor-not-allowed items-center gap-2.5 rounded-[10px] px-3 text-sm text-ink-muted/60"
        >
          <FolderOpen className="size-[18px]" aria-hidden />
          문서 관리
        </button>
      </nav>

      <RecentQuestions />

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 px-1 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2a2826] text-sm font-semibold text-ink">
          {me?.name.at(0) ?? ''}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{me?.name}</p>
          <p className="truncate text-xs text-ink-muted">{me?.department}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  )
}

function NewQuestionButton() {
  const asking = useIsAsking()
  const startNewConversation = useChatStore((state) => state.startNewConversation)
  const activateTab = useTabStore((state) => state.activateTab)

  return (
    <button
      type="button"
      disabled={asking}
      onClick={() => {
        startNewConversation()
        activateTab(GRAPH_TAB_ID)
      }}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-[22px] bg-ink text-sm font-medium text-[#111110] disabled:opacity-50"
    >
      <Plus className="size-4" aria-hidden />새 질문
    </button>
  )
}

function RecentQuestions() {
  // 셀렉터는 스토어의 실제 배열을 그대로 반환해야 합니다(매번 새 배열을 만들면 무한 렌더링을 일으킵니다).
  const messages = useChatStore((state) => state.messages)
  const questions = messages.filter((message) => message.kind === 'question')
  if (questions.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-1.5 text-xs font-medium text-ink-muted">최근 질문</p>
      {questions
        .slice()
        .reverse()
        .map((question) => (
          <p
            key={question.id}
            className="truncate rounded-lg bg-white/[0.06] px-3 py-2.5 text-[13px] text-white"
          >
            {question.text}
          </p>
        ))}
    </div>
  )
}
