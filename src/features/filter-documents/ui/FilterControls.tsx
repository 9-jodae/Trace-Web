import { ChevronDown } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

const FilterDropdownGroupContext = createContext<{
  openId: string | null
  setOpenId: (id: string | null) => void
} | null>(null)

/**
 * 같은 줄에 놓인 필터 드롭다운을 묶어 한 번에 하나만 열리게 합니다.
 * 하나가 열린 상태에서 다른 드롭다운을 열면 이전에 열려 있던 드롭다운은 닫히고,
 * 그룹 바깥을 누르거나 Escape를 누르면 열린 드롭다운이 닫힙니다.
 */
export function FilterDropdownGroup({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const value = useMemo(() => ({ openId, setOpenId }), [openId])

  useEffect(() => {
    if (openId === null) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenId(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openId])

  return (
    <FilterDropdownGroupContext.Provider value={value}>
      {/* `contents`라서 감싸는 div가 부모의 flex 배치에 끼어들지 않습니다. */}
      <div ref={containerRef} className="contents">
        {children}
      </div>
    </FilterDropdownGroupContext.Provider>
  )
}

/** 필터 드롭다운. 그룹 밖에서 쓰면 혼자서 하나짜리 그룹이 됩니다. */
export function FilterDropdown(props: { label: string; active: boolean; children: ReactNode }) {
  const group = useContext(FilterDropdownGroupContext)
  if (!group) {
    return (
      <FilterDropdownGroup>
        <FilterDropdown {...props} />
      </FilterDropdownGroup>
    )
  }
  return <GroupedFilterDropdown {...props} />
}

function GroupedFilterDropdown({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: ReactNode
}) {
  const group = useContext(FilterDropdownGroupContext)
  const id = useId()
  const isOpen = group?.openId === id

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        onClick={() => group?.setOpenId(isOpen ? null : id)}
        className={`flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] ${
          active ? 'bg-white/10 text-ink' : 'text-ink-dim hover:bg-white/5'
        }`}
      >
        {label}
        <ChevronDown className="size-2.5" aria-hidden />
      </button>
      {isOpen && (
        <div
          id={id}
          className="absolute top-full left-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-xl border border-border-dark-strong bg-surface-raised p-2 shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function CheckboxRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-white/5">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-ink" />
      {children}
    </label>
  )
}
