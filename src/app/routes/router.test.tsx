import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTokenStore } from '@/shared/api'
import { fail, mockServer, ok } from '@/shared/testing'
import { routes } from './router'

const me = {
  id: 'u1',
  email: 'hr.staff@local.docs199',
  name: '정서윤',
  departmentId: 'd1',
  department: '인사팀',
  position: 'STAFF',
  role: 'EMPLOYEE',
  clearance: 'INTERNAL',
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

let restore: () => void = () => {}

describe('인증 흐름', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useTokenStore.setState({ accessToken: null })
  })
  afterEach(() => restore())

  it('토큰이 없으면 로그인 화면으로 보낸다', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'docs199 로그인' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('로그인하면 토큰을 저장하고 메인 화면으로 이동한다', async () => {
    restore = mockServer((config) =>
      config.url === '/api/auth/login'
        ? ok({ accessToken: 'new-token', tokenType: 'Bearer' })
        : ok(me),
    )
    const router = renderAt('/login')

    await userEvent.type(screen.getByLabelText('이메일'), me.email)
    await userEvent.type(screen.getByLabelText('비밀번호'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('인사팀 · 정서윤')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(useTokenStore.getState().accessToken).toBe('new-token')
  })

  it('로그인 실패를 화면에 알린다', async () => {
    restore = mockServer(() => fail(401, 'UNAUTHENTICATED'))
    renderAt('/login')

    await userEvent.type(screen.getByLabelText('이메일'), me.email)
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    )
  })

  it('저장된 토큰이 만료되었으면 토큰을 지우고 로그인 화면으로 보낸다', async () => {
    useTokenStore.setState({ accessToken: 'expired' })
    restore = mockServer(() => fail(401, 'UNAUTHENTICATED'))
    const router = renderAt('/')

    expect(await screen.findByRole('heading', { name: 'docs199 로그인' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(useTokenStore.getState().accessToken).toBeNull()
  })

  it('저장된 토큰이 유효하면 새로고침 후에도 메인 화면을 보여준다', async () => {
    useTokenStore.setState({ accessToken: 'valid' })
    restore = mockServer(() => ok(me))
    renderAt('/')
    expect(await screen.findByText('인사팀 · 정서윤')).toBeInTheDocument()
  })
})
