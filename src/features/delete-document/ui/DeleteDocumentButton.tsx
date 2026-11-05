import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  adminDeleteDocument,
  adminDocumentKeys,
  adminErrorMessage,
  invalidateAfterDocumentChange,
} from '@/entities/document'
import { graphKeys } from '@/entities/graph'
import { buttonDanger, buttonSecondary, Modal } from '@/shared/ui'

/** "삭제" 버튼과 확인 모달. 소프트 삭제이며 같은 경로로 다시 올리면 복구됩니다. */
export function DeleteDocumentButton({
  documentId,
  title,
  onDeleted,
}: {
  documentId: string
  title: string
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () => adminDeleteDocument(documentId),
    onSuccess: async () => {
      // 상세 화면을 떠난 뒤 무효화해야 지운 문서를 다시 불러와 404를 띄우지 않습니다.
      onDeleted()
      queryClient.removeQueries({ queryKey: adminDocumentKeys.detail(documentId) })
      await invalidateAfterDocumentChange(queryClient)
      // 지운 문서의 노드·연결선이 그래프에서도 사라지도록 함께 무효화합니다.
      await queryClient.invalidateQueries({ queryKey: graphKeys.all })
    },
  })

  const close = () => {
    if (!mutation.isPending) setOpen(false)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonSecondary}>
        <Trash2 className="size-4" aria-hidden />
        삭제
      </button>
      {open && (
        <Modal
          title="문서 삭제"
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
            ‘{title}’을 삭제합니다. 검색·그래프·근거에서 바로 빠집니다. 같은 경로로 다시 올리면
            복구됩니다.
          </p>
          {mutation.error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {adminErrorMessage(mutation.error)}
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
