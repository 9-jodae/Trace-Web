import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { DepartmentChecklist, useDepartments } from '@/entities/department'
import {
  adminDocumentKeys,
  adminErrorMessage,
  adminUpdateAccess,
  CLEARANCE_LABEL,
  CLEARANCE_OPTIONS,
  invalidateAfterDocumentChange,
  POSITION_LABEL,
  POSITION_OPTIONS,
  type DocumentDetail,
} from '@/entities/document'
import type { Clearance, Position } from '@/entities/user'
import { toFieldErrors } from '@/shared/api'
import { buttonPrimary, buttonSecondary, Card, fieldInput, fieldLabel } from '@/shared/ui'
import { toAccessForm, toUpdateAccessInput, type AccessForm } from '../lib/accessForm'
import { AccessSummary } from './AccessSummary'

/** 열람 권한 카드. "수정"을 누르면 같은 자리에서 폼으로 바뀝니다. */
export function DocumentAccessCard({ detail }: { detail: DocumentDetail }) {
  const { data: departments = [] } = useDepartments()
  const [editing, setEditing] = useState(false)

  return (
    <Card
      title="열람 권한"
      action={
        !editing && (
          <button type="button" onClick={() => setEditing(true)} className={buttonSecondary}>
            수정
          </button>
        )
      }
    >
      {editing ? (
        <AccessEditor detail={detail} onDone={() => setEditing(false)} />
      ) : (
        <AccessSummary detail={detail} departments={departments} />
      )}
    </Card>
  )
}

function AccessEditor({ detail, onDone }: { detail: DocumentDetail; onDone: () => void }) {
  const queryClient = useQueryClient()
  const { data: departments = [] } = useDepartments()
  const [form, setForm] = useState<AccessForm>(() => toAccessForm(detail))
  const set = (patch: Partial<AccessForm>) => setForm((current) => ({ ...current, ...patch }))
  const id = detail.document.id

  const mutation = useMutation({
    mutationFn: () => adminUpdateAccess(id, toUpdateAccessInput(form)),
    onSuccess: async (updated) => {
      queryClient.setQueryData(adminDocumentKeys.detail(id), updated)
      onDone()
      await invalidateAfterDocumentChange(queryClient)
    },
  })
  const fieldErrors = toFieldErrors(mutation.error)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className={fieldLabel}>
          보안 등급
          <select
            required
            value={form.clearance}
            onChange={(event) => set({ clearance: event.target.value as Clearance })}
            className={fieldInput}
          >
            {CLEARANCE_OPTIONS.map((clearance) => (
              <option key={clearance} value={clearance}>
                {CLEARANCE_LABEL[clearance]}
              </option>
            ))}
          </select>
          {fieldErrors.clearance && (
            <span className="text-xs font-normal text-red-300">{fieldErrors.clearance}</span>
          )}
        </label>
        <label className={fieldLabel}>
          최소 직급
          <select
            value={form.minimumPosition ?? ''}
            onChange={(event) =>
              set({ minimumPosition: (event.target.value || null) as Position | null })
            }
            className={fieldInput}
          >
            <option value="">제한 없음</option>
            {POSITION_OPTIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABEL[position]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DepartmentChecklist
        legend="열람 부서"
        departments={departments}
        value={form.departmentIds}
        onChange={(departmentIds) => set({ departmentIds })}
        emptyHint="비워 두면 전체 부서가 열람합니다."
      />
      <label className={fieldLabel}>
        소유 부서
        <select
          value={form.ownerDepartmentId ?? ''}
          onChange={(event) => set({ ownerDepartmentId: event.target.value || null })}
          className={fieldInput}
        >
          {/* 소유 부서를 비우는 API가 없어 "없음"은 지금 지정되지 않은 문서에만 보여줍니다. */}
          {!detail.document.ownerDepartmentId && <option value="">지정 안 함</option>}
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-ink-muted">
          소유 부서는 열람 권한과 무관하며, 한 번 지정하면 비울 수 없습니다.
        </span>
      </label>
      {mutation.error && (
        <p role="alert" className="text-sm text-red-300">
          {adminErrorMessage(mutation.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonSecondary}>
          취소
        </button>
        <button type="submit" disabled={mutation.isPending} className={buttonPrimary}>
          저장
        </button>
      </div>
    </form>
  )
}
