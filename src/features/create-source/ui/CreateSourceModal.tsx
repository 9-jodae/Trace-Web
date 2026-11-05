import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useDepartments } from '@/entities/department'
import { adminErrorMessage, CLEARANCE_LABEL, CLEARANCE_OPTIONS } from '@/entities/document'
import { createSource, sourceKeys, type CreateSourceInput, type Source } from '@/entities/source'
import type { Clearance } from '@/entities/user'
import { toFieldErrors } from '@/shared/api'
import { buttonPrimary, buttonSecondary, fieldInput, fieldLabel, Modal } from '@/shared/ui'

const KIND_OPTIONS: { value: CreateSourceInput['kind']; label: string }[] = [
  { value: 'LOCAL', label: '로컬' },
  { value: 'OBSIDIAN', label: 'Obsidian' },
]

/** 소스 추가. 소스 수정·삭제는 서버 API가 없어 두지 않습니다. */
export function CreateSourceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (source: Source) => void
}) {
  const queryClient = useQueryClient()
  const { data: departments = [] } = useDepartments()
  const [kind, setKind] = useState<CreateSourceInput['kind']>('LOCAL')
  const [name, setName] = useState('')
  const [defaultDepartmentId, setDefaultDepartmentId] = useState<string | null>(null)
  const [defaultClearance, setDefaultClearance] = useState<Clearance>('PUBLIC')
  const [nameError, setNameError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: createSource,
    onSuccess: async (source) => {
      await queryClient.invalidateQueries({ queryKey: sourceKeys.list })
      onCreated(source)
    },
  })
  const fieldErrors = toFieldErrors(mutation.error)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('소스 이름을 입력하세요')
      return
    }
    setNameError(null)
    mutation.mutate({ kind, name: trimmed, defaultDepartmentId, defaultClearance })
  }

  return (
    <Modal
      title="소스 추가"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonSecondary}>
            취소
          </button>
          <button
            type="submit"
            form="create-source-form"
            disabled={mutation.isPending}
            className={buttonPrimary}
          >
            추가
          </button>
        </>
      }
    >
      <form id="create-source-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-ink-dim">종류</legend>
          <div className="flex gap-4">
            {KIND_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="accent-ink"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={fieldLabel}>
          이름
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(nameError ?? fieldErrors.name)}
            className={fieldInput}
          />
          {(nameError ?? fieldErrors.name) && (
            <span className="text-xs font-normal text-red-300">
              {nameError ?? fieldErrors.name}
            </span>
          )}
        </label>
        <label className={fieldLabel}>
          기본 소유 부서
          <select
            value={defaultDepartmentId ?? ''}
            onChange={(event) => setDefaultDepartmentId(event.target.value || null)}
            className={fieldInput}
          >
            <option value="">없음</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-ink-muted">
            업로드할 때 소유 부서의 기본값이 되고, 열람 부서를 비워 두면 새 문서는 이 부서만
            열람합니다.
          </span>
        </label>
        <label className={fieldLabel}>
          기본 보안 등급
          <select
            value={defaultClearance}
            onChange={(event) => setDefaultClearance(event.target.value as Clearance)}
            className={fieldInput}
          >
            {CLEARANCE_OPTIONS.map((clearance) => (
              <option key={clearance} value={clearance}>
                {CLEARANCE_LABEL[clearance]}
              </option>
            ))}
          </select>
        </label>
        {mutation.error && !fieldErrors.name && (
          <p role="alert" className="text-sm text-red-300">
            {adminErrorMessage(mutation.error)}
          </p>
        )}
      </form>
    </Modal>
  )
}
