import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Source } from '@/entities/source'
import { mockServer, ok } from '@/shared/testing'
import { UploadDocumentsModal } from './UploadDocumentsModal'

const SOURCE: Source = {
  id: 's1',
  kind: 'OBSIDIAN',
  name: '사내 위키',
  defaultDepartmentId: 'dep1',
  defaultClearance: 'INTERNAL',
  createdBy: 'u1',
}

function folderFile(relativePath: string, content = 'x') {
  const file = new File([content], relativePath.split('/').at(-1)!)
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
  return file
}

function renderModal(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UploadDocumentsModal source={SOURCE} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return onClose
}

let restore: () => void = () => {}

describe('UploadDocumentsModal', () => {
  afterEach(() => restore())

  it('폴더를 골라 미리 거르고, 소스 기본값으로 보낸 뒤 결과를 요약한다', async () => {
    const forms: FormData[] = []
    restore = mockServer((config) => {
      if (config.url === '/api/departments') return ok([{ id: 'dep1', name: '경영지원팀' }])
      if (config.url === '/api/admin/sources/s1/documents') {
        forms.push(config.data as FormData)
        return ok([
          {
            path: '공통/출장비.md',
            documentId: 'd1',
            version: 2,
            outcome: 'CREATED',
            reason: null,
          },
          {
            path: '공통/연차.md',
            documentId: 'd2',
            version: 1,
            outcome: 'UNCHANGED',
            reason: null,
          },
        ])
      }
      return ok(null)
    })
    renderModal()

    fireEvent.change(screen.getByTestId('folder-input'), {
      target: {
        files: [
          folderFile('vault/공통/출장비.md'),
          folderFile('vault/.obsidian/app.md'),
          folderFile('vault/공통/연차.md'),
        ],
      },
    })
    expect(await screen.findByText('보낼 파일 2개 · 제외 1개')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByLabelText('보안 등급')).toHaveValue('INTERNAL')
    expect(await screen.findByText(/소스 기본 부서\(경영지원팀\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '파일 2개 업로드' }))

    expect(
      await screen.findByText('새 문서 0 · 새 버전 1 · 변경 없음 1 · 제외 1 · 전송 실패 0'),
    ).toBeInTheDocument()
    expect(forms).toHaveLength(1)
    expect(forms[0]?.getAll('paths')).toEqual(['공통/출장비.md', '공통/연차.md'])
    expect(forms[0]?.get('clearance')).toBe('INTERNAL')
    expect(forms[0]?.get('ownerDepartmentId')).toBe('dep1')
    expect(forms[0]?.has('departmentIds')).toBe(false)

    const table = screen.getByRole('table')
    expect(within(table).getByRole('link', { name: '공통/출장비.md' })).toBeInTheDocument()
    expect(within(table).getByText('제외(보내지 않음)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '실패한 파일만 다시 보내기' })).toBeNull()
  })

  it('보낼 파일이 없으면 다음 단계로 갈 수 없다', async () => {
    restore = mockServer(() => ok([]))
    renderModal()
    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File(['x'], 'a.docx')] },
    })
    expect(await screen.findByText('보낼 파일 0개 · 제외 1개')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('전송 중에는 닫을 수 없고, 실패한 파일만 다시 보낼 수 있다', async () => {
    let release: (value: unknown) => void = () => {}
    let attempts = 0
    restore = mockServer(async (config) => {
      if (config.url !== '/api/admin/sources/s1/documents') return ok([])
      attempts += 1
      if (attempts === 1) {
        await new Promise((resolve) => (release = resolve))
        return { status: 503, body: 'unavailable' }
      }
      return ok([{ path: 'a.md', documentId: 'd1', version: 1, outcome: 'CREATED', reason: null }])
    })
    const onClose = renderModal()

    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File(['x'], 'a.md')] },
    })
    await userEvent.click(await screen.findByRole('button', { name: '다음' }))
    await userEvent.click(screen.getByRole('button', { name: '파일 1개 업로드' }))

    expect(await screen.findByText('묶음 1/1 전송 중 · 파일 0/1')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('alert')).toHaveTextContent('전송 중에는 닫을 수 없습니다')
    expect(onClose).not.toHaveBeenCalled()

    release(null)
    expect(await screen.findByText(/전송 실패 1/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '실패한 파일만 다시 보내기' }))
    expect(await screen.findByText(/새 문서 1 .* 전송 실패 0/)).toBeInTheDocument()
    expect(attempts).toBe(2)
  })
})
