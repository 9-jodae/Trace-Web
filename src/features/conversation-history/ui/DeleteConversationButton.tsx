import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  conversationKeys,
  deleteConversation,
  type ConversationSummary,
} from '@/entities/conversation'
import { buttonDanger, buttonSecondary, Modal } from '@/shared/ui'

/**
 * 대화 목록의 휴지통 버튼과 확인 모달. 서버(DELETE /api/conversations/{id})는 대화와 메시지를
 * 되돌릴 수 없게 지우므로 한 번 더 묻습니다. 지운 대화가 지금 열린 대화인지는 이 기능이 알 수
 * 없어서, 화면을 정리하는 일은 onDeleted를 받은 쪽이 합니다.
 */
export function DeleteConversationButton({
  conversationId,
  title,
  disabled,
  onDeleted,
  className = '',
}: {
  conversationId: string
  title: string
  disabled: boolean
  onDeleted: (conversationId: string) => void
  className?: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () => deleteConversation(conversationId),
    onSuccess: async () => {
      setOpen(false)
      onDeleted(conversationId)
      queryClient.removeQueries({ queryKey: conversationKeys.detail(conversationId) })
      // 다시 받아오기 전에도 목록에서 바로 사라지게 합니다.
      queryClient.setQueryData<ConversationSummary[]>(conversationKeys.all, (previous) =>
        previous?.filter((conversation) => conversation.id !== conversationId),
      )
      await queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    },
  })

  const close = () => {
    if (!mutation.isPending) {
      mutation.reset()
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`‘${title}’ 대화 삭제`}
        title="대화 삭제"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-white/10 hover:text-red-300 disabled:opacity-50 ${className}`}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
      {open && (
        <Modal
          title="대화 삭제"
          onClose={close}
          footer={
            <>
              <button type="button" onClick={close} className={buttonSecondary}>
                취소
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className={buttonDanger}
              >
                삭제
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-dim">
            ‘{title}’ 대화를 삭제합니다. 주고받은 질문과 답변이 모두 지워지며 되돌릴 수 없습니다.
          </p>
          {mutation.error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              대화를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
