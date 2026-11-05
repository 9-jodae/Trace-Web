import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export function FilterDropdown({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: ReactNode
}) {
  return (
    <details className="group relative">
      <summary
        className={`flex h-10 list-none items-center gap-1.5 rounded-lg px-2.5 text-[13px] [&::-webkit-details-marker]:hidden ${
          active ? 'bg-white/10 text-ink' : 'text-ink-dim hover:bg-white/5'
        }`}
      >
        {label}
        <ChevronDown className="size-2.5" aria-hidden />
      </summary>
      <div className="absolute top-full left-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-xl border border-border-dark-strong bg-surface-raised p-2 shadow-lg">
        {children}
      </div>
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
