import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FilePlus2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  adminErrorMessage,
  adminReviseDocument,
  invalidateAfterDocumentChange,
  type DocumentDetail,
} from '@/entities/document'
import { MAX_FILE_BYTES } from '@/shared/config'
import { buttonPrimary, buttonSecondary, fieldInput, fieldLabel, Modal } from '@/shared/ui'
import { hasSameExtension } from '../lib/extension'

/** "개정" 버튼과 모달. 파일 1개로 새 버전을 만들며 권한은 서버가 그대로 유지합니다. */
export function ReviseDocumentButton({ detail }: { detail: DocumentDetail }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonSecondary}>
        <FilePlus2 className="size-4" aria-hidden />
        개정
      </button>
      {open && <ReviseModal detail={detail} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReviseModal({ detail, onClose }: { detail: DocumentDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { document } = detail
  const [file, setFile] = useState<File | null>(null)
  const [author, setAuthor] = useState(document.author ?? '')
  const [authoredAt, setAuthoredAt] = useState(document.authoredAt ?? '')
  const [fileError, setFileError] = useState<string | null>(null)
  const [unchanged, setUnchanged] = useState(false)

  const mutation = useMutation({
    mutationFn: (selected: File) =>
      adminReviseDocument(document.id, {
        file: selected,
        author: author || null,
        authoredAt: authoredAt || null,
      }),
    onSuccess: async (result) => {
      await invalidateAfterDocumentChange(queryClient)
      if (result.outcome === 'UNCHANGED') setUnchanged(true)
      else onClose()
    },
  })

  const choose = (selected: File | null) => {
    setUnchanged(false)
    setFile(selected)
    if (!selected) return setFileError(null)
    if (!hasSameExtension(selected.name, document.extension)) {
      return setFileError('같은 형식의 파일만 개정할 수 있습니다')
    }
    if (selected.size > MAX_FILE_BYTES) return setFileError('20MB를 넘는 파일은 올릴 수 없습니다')
    if (selected.size === 0) return setFileError('빈 파일은 올릴 수 없습니다')
    setFileError(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (file && !fileError) mutation.mutate(file)
  }

  const requestClose = () => {
    if (!mutation.isPending) onClose()
  }

  return (
    <Modal
      title={`개정 · ${document.title}`}
      onClose={requestClose}
      footer={
        <>
          <button type="button" onClick={requestClose} className={buttonSecondary}>
            {unchanged ? '닫기' : '취소'}
          </button>
          <button
            type="submit"
            form="revise-document-form"
            disabled={!file || fileError !== null || mutation.isPending}
            className={buttonPrimary}
          >
            {mutation.isPending ? '올리는 중…' : '새 버전 올리기'}
          </button>
        </>
      }
    >
      <form id="revise-document-form" onSubmit={submit} className="flex flex-col gap-4">
        <label className={fieldLabel}>
          파일 (.{document.extension})
          <input
            type="file"
            accept={`.${document.extension}`}
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
            className="text-sm text-ink-dim file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-ink"
          />
          {fileError && <span className="text-xs font-normal text-red-300">{fileError}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={fieldLabel}>
            작성자
            <input
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className={fieldInput}
            />
          </label>
          <label className={fieldLabel}>
            작성일
            <input
              type="date"
              value={authoredAt}
              onChange={(event) => setAuthoredAt(event.target.value)}
              className={fieldInput}
            />
          </label>
        </div>
        <p className="text-xs text-ink-muted">권한은 그대로 유지됩니다.</p>
        {unchanged && (
          <p role="status" className="text-sm text-amber-300">
            내용이 같아 새 버전을 만들지 않았습니다
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
