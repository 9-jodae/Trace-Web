import { API_BASE_URL } from '@/shared/config'

export async function uploadDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE_URL}/documents`, { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as { id: string }
}
