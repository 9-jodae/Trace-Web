import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { placeDropdown, type DropdownPlacement } from '../lib/dropdownPlacement'

/**
 * 필터 버튼과 펼침 패널. 열 때 버튼 위아래 남은 공간을 재서 패널이 화면 밖으로 잘리지 않는 쪽으로 펼치고,
 * 그 높이를 넘으면 패널 안에서 스크롤합니다. 바깥을 누르거나 Esc를 누르면 닫혀 다른 패널과 겹치지 않습니다.
 */
export function FilterDropdown({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: ReactNode
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<DropdownPlacement | null>(null)
  const isOpen = placement !== null

  const handleToggle = () => {
    const details = detailsRef.current
    const summary = summaryRef.current
    const panel = panelRef.current
    if (!details?.open || !summary || !panel) {
      setPlacement(null)
      return
    }
    setPlacement(
      placeDropdown({
        anchor: summary.getBoundingClientRect(),
        contentHeight: panel.offsetHeight,
        viewportHeight: window.innerHeight,
      }),
    )
  }

  useEffect(() => {
    if (!isOpen) return
    const close = () => {
      if (detailsRef.current) detailsRef.current.open = false
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      summaryRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <details ref={detailsRef} onToggle={handleToggle} className="group relative">
      <summary
        ref={summaryRef}
        className={`flex h-10 list-none items-center gap-1.5 rounded-lg px-2.5 text-[13px] whitespace-nowrap [&::-webkit-details-marker]:hidden ${
          active ? 'bg-white/10 text-ink' : 'text-ink-dim hover:bg-white/5'
        }`}
      >
        {label}
        <ChevronDown className="size-2.5" aria-hidden />
      </summary>
      <div
        ref={panelRef}
        style={placement ? { maxHeight: placement.maxHeight } : undefined}
        className={clsx(
          'absolute left-0 z-20 flex min-w-48 flex-col gap-1 overflow-y-auto rounded-xl border border-border-dark-strong bg-surface-raised p-2 shadow-lg',
          placement?.side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
          // 펼칠 방향을 재기 전 한 프레임 동안 잘못된 위치에 보이지 않게 숨깁니다.
          !placement && 'invisible',
        )}
      >
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
