import { ChevronDown } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'

const FilterDropdownGroupContext = createContext<{
  openLabel: string | null
  setOpenLabel: (label: string | null) => void
} | null>(null)

/**
 * 같은 줄에 놓인 필터 드롭다운을 묶어 한 번에 하나만 열리게 합니다.
 * 하나가 열린 상태에서 다른 드롭다운을 열면 이전에 열려 있던 드롭다운은 닫힙니다.
 */
export function FilterDropdownGroup({ children }: { children: ReactNode }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null)
  return (
    <FilterDropdownGroupContext.Provider value={{ openLabel, setOpenLabel }}>
      {children}
    </FilterDropdownGroupContext.Provider>
  )
}

export function FilterDropdown({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: ReactNode
}) {
  const group = useContext(FilterDropdownGroupContext)
  const [localOpen, setLocalOpen] = useState(false)
  const isOpen = group ? group.openLabel === label : localOpen

  const toggle = () => {
    if (group) {
      group.setOpenLabel(isOpen ? null : label)
    } else {
      setLocalOpen((prev) => !prev)
    }
  }

  return (
    <details open={isOpen} className="group relative">
      <summary
        onClick={(event) => {
          event.preventDefault()
          toggle()
        }}
        className={`flex h-10 list-none items-center gap-1.5 rounded-lg px-2.5 text-[13px] [&::-webkit-details-marker]:hidden ${
          active ? 'bg-white/10 text-ink' : 'text-ink-dim hover:bg-white/5'
        }`}
      >
        {label}
        <ChevronDown className="size-2.5" aria-hidden />
      </summary>
      {isOpen && (
        <div className="absolute top-full left-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-xl border border-border-dark-strong bg-surface-raised p-2 shadow-lg">
          {children}
        </div>
      )}
    </details>
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
