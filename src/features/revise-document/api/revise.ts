import { API_BASE_URL } from '@/shared/config'

/** 새 버전 등록 → 서버에서 이전 버전은 근거에서 제외 */
export async function reviseDocument(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE_URL}/documents/${id}/versions`, { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
