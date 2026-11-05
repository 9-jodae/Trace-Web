import { X } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'

/**
 * 화면 가운데에 띄우는 대화 상자. Esc·배경·닫기 버튼은 모두 onClose를 부르며,
 * 닫을 수 없는 상황(전송 중 등)인지는 onClose를 받은 쪽이 판단합니다.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const titleId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-border-dark-strong bg-surface-raised text-ink shadow-2xl ${
          wide ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border-dark px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted hover:bg-white/5 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border-dark px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
