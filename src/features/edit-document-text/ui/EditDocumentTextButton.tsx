import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilLine } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  adminDownloadDocument,
  adminErrorMessage,
  adminReviseDocument,
  documentFileName,
  invalidateAfterDocumentChange,
  type DocumentDetail,
} from '@/entities/document'
import { graphKeys } from '@/entities/graph'
import { MAX_FILE_BYTES } from '@/shared/config'
import { buttonPrimary, buttonSecondary, Modal } from '@/shared/ui'
import { isTextEditable } from '../lib/editable'

/** "내용 편집" 버튼과 모달. 현재 버전 원문을 고쳐 저장하면 같은 형식의 새 버전을 만듭니다. */
export function EditDocumentTextButton({ detail }: { detail: DocumentDetail }) {
  const [open, setOpen] = useState(false)
  const editable = isTextEditable(detail.document.extension)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!editable}
        title={editable ? undefined : '이 형식은 서버 지원 후 수정할 수 있습니다'}
        className={buttonSecondary}
      >
        <PencilLine className="size-4" aria-hidden />
        내용 편집
      </button>
      {open && <EditModal detail={detail} onClose={() => setOpen(false)} />}
    </>
  )
}

function EditModal({ detail, onClose }: { detail: DocumentDetail; onClose: () => void }) {
  const { document } = detail
  const original = useQuery({
    queryKey: ['document-edit', document.id, document.currentVersion],
    queryFn: async () => (await adminDownloadDocument(document.id)).text(),
    // 편집 중 창 포커스로 원문을 다시 받아 입력이 흔들리지 않게 합니다
    staleTime: Infinity,
    gcTime: 0,
  })
  if (original.isPending) {
    return (
      <Modal title={`내용 편집 · ${document.title}`} onClose={onClose}>
        <p className="text-sm text-ink-dim">원문을 불러오는 중…</p>
      </Modal>
    )
  }
  if (original.isError) {
    return (
      <Modal title={`내용 편집 · ${document.title}`} onClose={onClose}>
        <p role="alert" className="text-sm text-red-300">
          {adminErrorMessage(original.error)}
        </p>
      </Modal>
    )
  }
  return <EditForm detail={detail} original={original.data} onClose={onClose} />
}

function EditForm({
  detail,
  original,
  onClose,
}: {
  detail: DocumentDetail
  original: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { document } = detail
  const [text, setText] = useState(original)
  const [notice, setNotice] = useState<string | null>(null)
  const file = new File([text], documentFileName(document), { type: 'text/plain' })
  const dirty = text !== original
  const tooLarge = file.size > MAX_FILE_BYTES
  const empty = text.trim().length === 0

  const mutation = useMutation({
    mutationFn: () =>
      adminReviseDocument(document.id, {
        file,
        author: document.author,
        authoredAt: document.authoredAt,
      }),
    onSuccess: async (result) => {
      await invalidateAfterDocumentChange(queryClient)
      await queryClient.invalidateQueries({ queryKey: graphKeys.all })
      if (result.outcome === 'EXCLUDED')
        setNotice('서버가 허용하지 않는 형식이라 저장하지 못했습니다')
      else if (result.outcome === 'UNCHANGED') setNotice('내용이 같아 새 버전을 만들지 않았습니다')
      else onClose()
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setNotice(null)
    if (dirty && !tooLarge && !empty) mutation.mutate()
  }

  const requestClose = () => {
    if (mutation.isPending) return
    if (!dirty || window.confirm('저장하지 않은 수정 내용을 버릴까요?')) onClose()
  }

  return (
    <Modal
      wide
      title={`내용 편집 · ${document.title}`}
      onClose={requestClose}
      footer={
        <>
          <button type="button" onClick={requestClose} className={buttonSecondary}>
            취소
          </button>
          <button
            type="submit"
            form="edit-document-text-form"
            disabled={!dirty || tooLarge || empty || mutation.isPending}
            className={buttonPrimary}
          >
            {mutation.isPending ? '저장하는 중…' : '저장'}
          </button>
        </>
      }
    >
      <form id="edit-document-text-form" onSubmit={submit} className="flex flex-col gap-3">
        <textarea
          aria-label="문서 내용"
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          className="h-[60vh] w-full resize-none rounded-md border border-border-dark-strong bg-surface p-3 font-mono text-sm text-ink outline-none focus:border-blue-400/60"
        />
        <p className="text-xs text-ink-muted">
          저장하면 v{document.currentVersion + 1} 버전이 만들어집니다. 권한은 그대로 유지됩니다.
        </p>
        {empty && (
          <p role="alert" className="text-sm text-red-300">
            빈 문서는 저장할 수 없습니다
          </p>
        )}
        {tooLarge && (
          <p role="alert" className="text-sm text-red-300">
            20MB를 넘는 문서는 저장할 수 없습니다
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-amber-300">
            {notice}
          </p>
        )}
        {mutation.error && (
          <p role="alert" className="text-sm text-red-300">
            {adminErrorMessage(mutation.error)}
          </p>
        )}
      </form>
    </Modal>
  )
}
