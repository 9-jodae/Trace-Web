// 관리 화면에서 반복해서 쓰는 Tailwind 클래스 묶음입니다(다크 테마 토큰 기준).

export const buttonPrimary =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-ink px-3.5 text-sm font-medium text-[#111110] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40'

export const buttonSecondary =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border-dark-strong bg-surface-raised px-3.5 text-sm text-ink-dim hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

export const buttonDanger =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500/90 px-3.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40'

export const fieldInput =
  'h-9 w-full rounded-lg border border-border-dark-strong bg-surface px-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-white/30 focus:outline-none'

export const fieldLabel = 'flex flex-col gap-1.5 text-xs font-medium text-ink-dim'
