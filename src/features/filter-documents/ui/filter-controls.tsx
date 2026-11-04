import { DOCUMENT_TYPES, SUPPORTED_EXTENSIONS } from '@/shared/config'
import { useSearchFilter } from '../model/filter-store'

const SOURCES = [
  { value: 'notion', label: 'Notion' },
  { value: 'obsidian', label: 'Obsidian' },
  { value: 'local', label: '로컬 드라이브' },
] as const

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function FilterControls() {
  const { filter, setFilter } = useSearchFilter()
  return (
    <div>
      <fieldset>
        <legend>문서함</legend>
        {SOURCES.map((s) => (
          <label key={s.value}>
            <input type="checkbox" checked={filter.sources.includes(s.value)}
              onChange={() => setFilter({ sources: toggle(filter.sources, s.value) })} />
            {s.label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>문서 유형</legend>
        {DOCUMENT_TYPES.map((t) => (
          <label key={t}>
            <input type="checkbox" checked={filter.types.includes(t)}
              onChange={() => setFilter({ types: toggle(filter.types, t) })} />
            {t}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>확장자</legend>
        {SUPPORTED_EXTENSIONS.map((x) => (
          <label key={x}>
            <input type="checkbox" checked={filter.extensions.includes(x)}
              onChange={() => setFilter({ extensions: toggle(filter.extensions, x) })} />
            .{x}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>작성 기간</legend>
        <input type="date" value={filter.period.from ?? ''}
          onChange={(e) => setFilter({ period: { ...filter.period, from: e.target.value } })} />
        <input type="date" value={filter.period.to ?? ''}
          onChange={(e) => setFilter({ period: { ...filter.period, to: e.target.value } })} />
      </fieldset>
    </div>
  )
}
