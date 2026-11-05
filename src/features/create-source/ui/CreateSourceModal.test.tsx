import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fail, mockServer, ok } from '@/shared/testing'
import { CreateSourceModal } from './CreateSourceModal'

function renderModal() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onCreated = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <CreateSourceModal onClose={() => {}} onCreated={onCreated} />
    </QueryClientProvider>,
  )
  return onCreated
}

let restore: () => void = () => {}

describe('CreateSourceModal', () => {
  afterEach(() => restore())

  it('공백뿐인 이름은 보내지 않는다', async () => {
    let calls = 0
    restore = mockServer((config) => {
      if (config.url === '/api/admin/sources') calls += 1
      return ok([])
    })
    renderModal()

    await userEvent.type(screen.getByLabelText('이름'), '   ')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    expect(screen.getByText('소스 이름을 입력하세요')).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('앞뒤 공백을 빼고 기본값(로컬·공개)과 함께 만든다', async () => {
    let body: unknown
    restore = mockServer((config) => {
      if (config.url === '/api/admin/sources' && config.method === 'post') {
        body = JSON.parse(config.data as string)
        return ok({ id: 's9', ...(body as object), createdBy: 'u1' })
      }
      return ok([])
    })
    const onCreated = renderModal()

    await userEvent.click(screen.getByLabelText('Obsidian'))
    await userEvent.type(screen.getByLabelText('이름'), '  사내 위키 ')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(body).toEqual({
      kind: 'OBSIDIAN',
      name: '사내 위키',
      defaultDepartmentId: null,
      defaultClearance: 'PUBLIC',
    })
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({ id: 's9' })
  })

  it('서버 오류를 폼 아래에 보여준다', async () => {
    restore = mockServer((config) =>
      config.url === '/api/admin/sources' ? fail(403, 'FORBIDDEN') : ok([]),
    )
    renderModal()
    await userEvent.type(screen.getByLabelText('이름'), '위키')
    await userEvent.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('문서 관리 권한이 없습니다.')
  })
})
