import { useIsMutating, useMutation, useMutationState } from '@tanstack/react-query'
import { askQuestion, type AskQuestionFilters } from '@/entities/answer'
import { isLocalEditMode } from '@/entities/document'
import { toErrorMessage } from '@/shared/api'
import { isSampleEditRequest, sampleEditProposals } from '../lib/sampleEditProposals'
import { useChatStore } from './chatStore'

const ASK_MUTATION_KEY = ['answer', 'ask'] as const

interface AskVariables {
  conversationId: string | null
  message: string
  filters?: AskQuestionFilters
  /** 질문을 보낼 때의 대화 맥락 번호. 서버로는 보내지 않습니다. */
  contextId: number
}

/**
 * 검색 필터는 이 feature가 모르는 features/filter-documents의 상태라, FSD 규칙상(같은 레이어끼리
 * import 금지) 직접 꺼내 올 수 없습니다. 호출하는 widget이 현재 필터를 변환해서 넘겨줍니다.
 */
export function useAskQuestion() {
  // 응답 처리는 mutate(..., { onSuccess }) 대신 여기(useMutation 옵션)에 둡니다. mutate에 넘긴
  // 콜백은 호출한 컴포넌트가 사라지면 실행되지 않는데, 홈 화면에서 첫 질문을 보내면 화면이
  // 대화 화면으로 바뀌면서 HomeComposer가 사라져 답변이 버려졌습니다.
  // 그래서 응답을 기다리는 동안 새 대화를 시작하거나 다른 대화를 열거나 로그아웃하면, 늦게 온
  // 답변이 바뀐 화면에 붙지 않도록 질문할 때의 맥락 번호(contextId)와 비교해 버립니다.
  const { mutate, isPending } = useMutation({
    mutationKey: ASK_MUTATION_KEY,
    mutationFn: ({ conversationId, message, filters }: AskVariables) =>
      askQuestion({ conversationId, message, filters }),
    onSuccess: async (answer, { contextId, message }) => {
      if (useChatStore.getState().contextId !== contextId) return
      // 샘플을 못 불러와도 답변은 그대로 보여 줍니다.
      const samples =
        !answer.editProposals && isLocalEditMode() && isSampleEditRequest(message)
          ? await sampleEditProposals(answer.sources).catch(() => [])
          : []
      const chat = useChatStore.getState()
      if (chat.contextId !== contextId) return
      // evidence는 "임시 계약" 필드라 아직 안 주는 경로(AI_MODE=mock 등)가 있을 수 있어 기본값을 둡니다.
      chat.addAnswer(
        answer.conversationId,
        answer.answer,
        answer.sources,
        answer.evidence ?? [],
        answer.keywords ?? [],
        answer.editProposals ?? samples,
      )
    },
    onError: (error, { contextId }) => {
      const chat = useChatStore.getState()
      if (chat.contextId !== contextId) return
      chat.addError(toErrorMessage(error))
    },
  })

  const ask = (message: string, filters?: AskQuestionFilters) => {
    const { conversationId, contextId, addQuestion } = useChatStore.getState()
    addQuestion(message)
    mutate({ conversationId, message, filters, contextId })
  }

  return { ask, isPending }
}

/** 답변을 기다리는 중인지. 대화 패널 밖의 버튼에서도 씁니다. */
export function useIsAsking() {
  return useIsMutating({ mutationKey: ASK_MUTATION_KEY }) > 0
}

/**
 * 지금 보고 있는 대화에서 답변을 기다리는 중이면 그 질문을 보낸 시각(ms)을, 아니면 null을 줍니다.
 * 기다리는 중에 다른 대화를 열면 늦게 올 답변은 버려지므로, 그 요청은 이 대화의 대기로 치지 않습니다.
 */
export function usePendingQuestionSince(): number | null {
  const contextId = useChatStore((state) => state.contextId)
  const pending = useMutationState({
    filters: { mutationKey: ASK_MUTATION_KEY, status: 'pending' },
    select: (mutation) => ({
      contextId: (mutation.state.variables as AskVariables | undefined)?.contextId,
      submittedAt: mutation.state.submittedAt,
    }),
  })
  return pending.find((item) => item.contextId === contextId)?.submittedAt ?? null
}
