import { useIsMutating, useMutation } from '@tanstack/react-query'
import { askQuestion, type AskQuestionFilters } from '@/entities/answer'
import { toErrorMessage } from '@/shared/api'
import { useChatStore } from './chatStore'

const ASK_MUTATION_KEY = ['answer', 'ask'] as const

/**
 * 검색 필터는 이 feature가 모르는 features/filter-documents의 상태라, FSD 규칙상(같은 레이어끼리
 * import 금지) 직접 꺼내 올 수 없습니다. 호출하는 widget이 현재 필터를 변환해서 넘겨줍니다.
 */
export function useAskQuestion() {
  // 응답 처리는 mutate(..., { onSuccess }) 대신 여기(useMutation 옵션)에 둡니다. mutate에 넘긴
  // 콜백은 호출한 컴포넌트가 사라지면 실행되지 않는데, 홈 화면에서 첫 질문을 보내면 화면이
  // 대화 화면으로 바뀌면서 HomeComposer가 사라져 답변이 버려졌습니다.
  const { mutate, isPending } = useMutation({
    mutationKey: ASK_MUTATION_KEY,
    mutationFn: askQuestion,
    onSuccess: (answer) =>
      useChatStore
        .getState()
        // evidence는 "임시 계약" 필드라 아직 안 주는 경로(AI_MODE=mock 등)가 있을 수 있어 기본값을 둡니다.
        .addAnswer(answer.conversationId, answer.answer, answer.sources, answer.evidence ?? []),
    onError: (error) => useChatStore.getState().addError(toErrorMessage(error)),
  })

  const ask = (message: string, filters?: AskQuestionFilters) => {
    const { conversationId, addQuestion } = useChatStore.getState()
    addQuestion(message)
    mutate({ conversationId, message, filters })
  }

  return { ask, isPending }
}

/** 답변을 기다리는 중인지. 대화 패널 밖의 버튼에서도 씁니다. */
export function useIsAsking() {
  return useIsMutating({ mutationKey: ASK_MUTATION_KEY }) > 0
}
