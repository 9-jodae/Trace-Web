import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalEditStore, type DocumentDetail } from '@/entities/document'
import { EditDocumentTextButton } from './EditDocumentTextButton'

const api = vi.hoisted(() => ({
  adminDownloadDocument: vi.fn(),
  adminReviseDocument: vi.fn(),
  invalidateAfterDocumentChange: vi.fn(),
}))

vi.mock('@/entities/document', async (original) => ({
  ...(await original<typeof import('@/entities/document')>()),
  ...api,
}))

const detail = (extension = 'md') =>
  ({
    document: {
      id: 'd1',
      title: '연차 규정',
      relativePath: '규정/leave.md',
      extension,
      author: '담당자',
      authoredAt: '2026-01-01',
      currentVersion: 2,
    },
  }) as unknown as DocumentDetail

function renderButton(value = detail()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <EditDocumentTextButton detail={value} />
    </QueryClientProvider>,
  )
}

async function openEditor() {
  await userEvent.click(screen.getByRole('button', { name: '내용 편집' }))
  return (await screen.findByRole('textbox', { name: '문서 내용' })) as HTMLTextAreaElement
}

describe('EditDocumentTextButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DEV', false)
    useLocalEditStore.setState({ edits: {} })
    api.adminDownloadDocument.mockResolvedValue({ text: async () => '이월은 5일이다.' })
    api.adminReviseDocument.mockResolvedValue({ outcome: 'CREATED' })
  })

  it('PDF는 서버 지원 전까지 열 수 없다', () => {
    renderButton(detail('pdf'))
    expect(screen.getByRole('button', { name: '내용 편집' })).toBeDisabled()
  })

  it('원문을 불러와 고친 내용을 같은 형식의 새 버전으로 저장하고 닫는다', async () => {
    renderButton()
    const editor = await openEditor()
    expect(editor).toHaveValue('이월은 5일이다.')
    await userEvent.clear(editor)
    await userEvent.type(editor, '이월은 7일이다.')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(api.adminReviseDocument).toHaveBeenCalledTimes(1))
    const [id, input] = api.adminReviseDocument.mock.lastCall as [
      string,
      { file: File; author: string },
    ]
    expect(id).toBe('d1')
    expect(input.file.name).toBe('leave.md')
    expect(await input.file.text()).toBe('이월은 7일이다.')
    expect(input.author).toBe('담당자')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('고치지 않았거나 비우면 저장할 수 없다', async () => {
    renderButton()
    const editor = await openEditor()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    await userEvent.clear(editor)
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('빈 문서')
  })

  it('서버가 형식을 거부하면 입력을 유지하고 알린다', async () => {
    api.adminReviseDocument.mockResolvedValue({ outcome: 'EXCLUDED' })
    renderButton(detail('txt'))
    const editor = await openEditor()
    await userEvent.type(editor, ' 추가')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('status')).toHaveTextContent('허용하지 않는 형식')
    expect(editor).toHaveValue('이월은 5일이다. 추가')
  })

  it('수정 중 닫을 때 확인하고, 취소하면 내용을 유지한다', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderButton()
    const editor = await openEditor()
    await userEvent.type(editor, ' 추가')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    confirm.mockRestore()
  })

  it('개발 서버에서는 서버에 저장하지 않고 메모리에만 두며 다시 열면 그 내용이 보인다', async () => {
    vi.stubEnv('DEV', true)
    renderButton()
    const editor = await openEditor()
    expect(screen.getByText(/새로고침하면 원래대로/)).toBeInTheDocument()
    await userEvent.type(editor, ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.adminReviseDocument).not.toHaveBeenCalled()
    expect(useLocalEditStore.getState().edits.d1).toEqual({
      title: '연차 규정',
      text: '이월은 5일이다. 수정',
    })
    expect(await openEditor()).toHaveValue('이월은 5일이다. 수정')
  })

  it('원문을 못 불러오면 오류를 보여 준다', async () => {
    api.adminDownloadDocument.mockRejectedValue(new Error('x'))
    renderButton()
    await userEvent.click(screen.getByRole('button', { name: '내용 편집' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
