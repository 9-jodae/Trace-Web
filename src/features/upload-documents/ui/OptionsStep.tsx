import { DepartmentChecklist, useDepartments } from '@/entities/department'
import {
  CLEARANCE_LABEL,
  CLEARANCE_OPTIONS,
  POSITION_LABEL,
  POSITION_OPTIONS,
  type UploadOptions,
} from '@/entities/document'
import type { Source } from '@/entities/source'
import type { Clearance, Position } from '@/entities/user'
import { fieldInput, fieldLabel } from '@/shared/ui'

/** 2단계: 요청의 모든 파일에 똑같이 적용할 권한과 정보 */
export function OptionsStep({
  source,
  value,
  onChange,
}: {
  source: Source
  value: UploadOptions
  onChange: (next: UploadOptions) => void
}) {
  const { data: departments = [] } = useDepartments()
  const set = (patch: Partial<UploadOptions>) => onChange({ ...value, ...patch })
  const sourceDefault = departments.find((item) => item.id === source.defaultDepartmentId)

  return (
    <div className="flex flex-col gap-4">
      <label className={fieldLabel}>
        보안 등급
        <select
          required
          value={value.clearance}
          onChange={(event) => set({ clearance: event.target.value as Clearance })}
          className={fieldInput}
        >
          {CLEARANCE_OPTIONS.map((clearance) => (
            <option key={clearance} value={clearance}>
              {CLEARANCE_LABEL[clearance]}
            </option>
          ))}
        </select>
      </label>

      <DepartmentChecklist
        legend="열람 부서"
        departments={departments}
        value={value.departmentIds}
        onChange={(departmentIds) => set({ departmentIds })}
        emptyHint={
          source.defaultDepartmentId
            ? `비워 두면 새 문서는 소스 기본 부서(${sourceDefault?.name ?? '알 수 없음'})만 열람합니다.`
            : '비워 두면 전체 부서가 열람합니다.'
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <label className={fieldLabel}>
          최소 직급
          <select
            value={value.minimumPosition ?? ''}
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
        <label className={fieldLabel}>
          소유 부서
          <select
            value={value.ownerDepartmentId ?? ''}
            onChange={(event) => set({ ownerDepartmentId: event.target.value || null })}
            className={fieldInput}
          >
            {!source.defaultDepartmentId && <option value="">없음</option>}
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={fieldLabel}>
          작성자
          <input
            type="text"
            value={value.author ?? ''}
            onChange={(event) => set({ author: event.target.value || null })}
            className={fieldInput}
          />
        </label>
        <label className={fieldLabel}>
          작성일
          <input
            type="date"
            value={value.authoredAt ?? ''}
            onChange={(event) => set({ authoredAt: event.target.value || null })}
            className={fieldInput}
          />
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        권한·작성자·작성일은 이번에 보내는 모든 파일에 같은 값이 들어갑니다. 권한이 다른 파일은
        업로드를 나눠서 진행하세요.
      </p>
      <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-ink-dim">
        이미 올린 경로의 파일은 내용이 바뀐 경우에만 새 버전이 되고, 이때 보안 등급과 여기서 고른
        열람 부서·최소 직급·소유 부서로 바뀝니다(비워 둔 항목은 기존 값 유지). 내용이 같으면 권한은
        바뀌지 않습니다.
      </p>
    </div>
  )
}
