import type { ReactNode } from 'react'

export function Card({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="rounded-xl border border-border-dark bg-panel px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-all text-ink-dim">{children}</dd>
    </div>
  )
}
