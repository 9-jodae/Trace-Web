import { useQueryClient } from '@tanstack/react-query'
import { FolderOpen, MessageCircle, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LogoutButton } from '@/features/auth'
import { useChatStore, useIsAsking } from '@/features/ask-question'
import { RecentConversations, useOpenConversation } from '@/features/conversation-history'
import { GRAPH_TAB_ID, useTabStore } from '@/features/document-tabs'
import { conversationKeys } from '@/entities/conversation'
import { useMe, type Role } from '@/entities/user'
import { SERVICE_NAME, serviceLogo } from '@/shared/brand'

const ADMIN_ROLES: readonly Role[] = ['DOC_ADMIN', 'SYSTEM_ADMIN']
const ADMIN_PATH = '/admin/documents'

/**
 * 왼쪽 네비게이션. "문서 관리"는 관리자 역할(DOC_ADMIN·SYSTEM_ADMIN)에게만 보여줍니다(화면 편의용,
 * 실제 권한은 서버가 판단). 현재 경로에 따라 "질문하기"와 "문서 관리" 중 하나를 선택 상태로 둡니다.
 * "최근 질문"은 서버에 저장된 내 대화를 최근순으로 보여주고, 고르면 그 대화를 다시 불러옵니다.
 */
export function Sidebar() {
  const { data: me } = useMe()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isAdmin = me !== undefined && ADMIN_ROLES.includes(me.role)
  const onAdmin = pathname.startsWith('/admin')

  return (
    <aside className="flex h-full w-[249px] shrink-0 flex-col gap-6 bg-panel px-4 py-5">
      <div className="flex items-center gap-3 px-1 py-0.5">
        <img src={serviceLogo} alt="" className="size-9" />
        <p className="text-[17px] font-semibold tracking-tight text-ink">{SERVICE_NAME}</p>
      </div>

      <NewQuestionButton />

      <nav className="flex flex-col gap-0.5" aria-label="주 메뉴">
        <button
          type="button"
          aria-current={onAdmin ? undefined : 'page'}
          onClick={() => navigate('/')}
          className={clsx(navItem, onAdmin ? navIdle : navActive)}
        >
          <MessageCircle className="size-[18px]" aria-hidden />
          질문하기
        </button>
        {isAdmin && (
          <button
            type="button"
            aria-current={onAdmin ? 'page' : undefined}
            onClick={() => navigate(ADMIN_PATH)}
            className={clsx(navItem, onAdmin ? navActive : navIdle)}
          >
            <FolderOpen className="size-[18px]" aria-hidden />
            문서 관리
          </button>
        )}
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

const navItem = 'flex h-11 items-center gap-2.5 rounded-[10px] px-3 text-sm'
const navActive = 'bg-white/10 font-medium text-white'
const navIdle = 'text-ink-dim hover:bg-white/5 hover:text-ink'

function NewQuestionButton() {
  const navigate = useNavigate()
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
        navigate('/')
      }}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-[22px] bg-ink text-sm font-medium text-[#111110] disabled:opacity-50"
    >
      <Plus className="size-4" aria-hidden />새 질문
    </button>
  )
}

function RecentQuestions() {
  const navigate = useNavigate()
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
      if (!messages) return
      useChatStore.getState().loadConversation(id, messages)
      navigate('/')
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
