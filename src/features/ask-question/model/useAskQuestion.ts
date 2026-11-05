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
  const { mutate, isPending } = useMutation({
    mutationKey: ASK_MUTATION_KEY,
    mutationFn: askQuestion,
  })

  const ask = (message: string, filters?: AskQuestionFilters) => {
    const { conversationId, addQuestion, addAnswer, addError } = useChatStore.getState()
    addQuestion(message)
    mutate(
      { conversationId, message, filters },
      {
        // evidence는 "임시 계약" 필드라 아직 안 주는 경로(AI_MODE=mock 등)가 있을 수 있어 기본값을 둡니다.
        onSuccess: (answer) =>
          addAnswer(answer.conversationId, answer.answer, answer.sources, answer.evidence ?? []),
        onError: (error) => addError(toErrorMessage(error)),
      },
    )
  }

  return { ask, isPending }
}

/** 답변을 기다리는 중인지. 대화 패널 밖의 버튼에서도 씁니다. */
export function useIsAsking() {
  return useIsMutating({ mutationKey: ASK_MUTATION_KEY }) > 0
}
