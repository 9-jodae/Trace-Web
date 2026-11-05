/** 바이트를 KB/MB로 표시합니다(1024 단위). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** ISO 시각을 한국어 날짜·시각으로 표시합니다. 없으면 "—" */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}
