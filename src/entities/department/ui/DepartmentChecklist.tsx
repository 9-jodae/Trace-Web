import type { Department } from '../model/types'

/** 부서 여러 개 고르기. 아무것도 고르지 않았을 때의 의미는 emptyHint로 알립니다. */
export function DepartmentChecklist({
  departments,
  value,
  onChange,
  emptyHint,
  legend,
}: {
  departments: Department[]
  value: string[]
  onChange: (next: string[]) => void
  emptyHint: string
  legend: string
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-ink-dim">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {departments.map((department) => {
          const checked = value.includes(department.id)
          return (
            <label
              key={department.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm ${
                checked
                  ? 'border-white/30 bg-white/10 text-ink'
                  : 'border-border-dark-strong text-ink-dim hover:text-ink'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(department.id)}
                className="accent-ink"
              />
              {department.name}
            </label>
          )
        })}
      </div>
      {value.length === 0 && <p className="text-xs text-ink-muted">{emptyHint}</p>}
    </fieldset>
  )
}
