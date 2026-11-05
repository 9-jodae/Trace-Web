import { useIsMutating, useMutation } from '@tanstack/react-query'
import { askQuestion } from '@/entities/answer'
import { toErrorMessage } from '@/shared/api'
import { useChatStore } from './chatStore'

const ASK_MUTATION_KEY = ['answer', 'ask'] as const

export function useAskQuestion() {
  const { mutate, isPending } = useMutation({
    mutationKey: ASK_MUTATION_KEY,
    mutationFn: askQuestion,
  })

  const ask = (message: string) => {
    const { conversationId, addQuestion, addAnswer, addError } = useChatStore.getState()
    addQuestion(message)
    mutate(
      { conversationId, message },
      {
        onSuccess: (answer) => addAnswer(answer.conversationId, answer.answer, answer.sources),
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
