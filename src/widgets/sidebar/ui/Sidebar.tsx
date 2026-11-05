import { useQueryClient } from '@tanstack/react-query'
import { FolderOpen, MessageCircle, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LogoutButton } from '@/features/auth'
import { useChatStore, useIsAsking } from '@/features/ask-question'
import { RecentConversations, useOpenConversation } from '@/features/conversation-history'
import { GRAPH_TAB_ID, useTabStore } from '@/features/document-tabs'
import { conversationKeys } from '@/entities/conversation'
import { useMe } from '@/entities/user'
import logo from './assets/logo.svg'

/**
 * 왼쪽 네비게이션. "문서 관리"는 관리자 기능이 아직 기획되지 않아 비활성 상태로만 둡니다.
 * "최근 질문"은 서버에 저장된 내 대화를 최근순으로 보여주고, 고르면 그 대화를 다시 불러옵니다.
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

      <div className="flex min-h-0 flex-1 flex-col">
        <RecentQuestions />
      </div>

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
  const queryClient = useQueryClient()
  const asking = useIsAsking()
  const conversationId = useChatStore((state) => state.conversationId)
  const answerCount = useChatStore(
    (state) => state.messages.filter((message) => message.kind === 'answer').length,
  )
  const { open, isLoading } = useOpenConversation()
  const [openError, setOpenError] = useState(false)

  // 새 대화가 만들어지거나 답변이 추가되면 대화 제목·순서가 바뀌므로 목록을 다시 받아옵니다.
  useEffect(() => {
    if (conversationId === null) return
    void queryClient.invalidateQueries({ queryKey: conversationKeys.all })
  }, [conversationId, answerCount, queryClient])

  const select = async (id: string) => {
    setOpenError(false)
    try {
      const messages = await open(id)
      useChatStore.getState().loadConversation(id, messages)
    } catch {
      setOpenError(true)
    }
  }

  return (
    <>
      <RecentConversations
        activeConversationId={conversationId}
        disabled={asking || isLoading}
        onSelect={(id) => void select(id)}
      />
      {openError && (
        <p role="alert" className="px-3 pt-1 text-xs text-red-300">
          대화를 불러오지 못했습니다.
        </p>
      )}
    </>
  )
}
