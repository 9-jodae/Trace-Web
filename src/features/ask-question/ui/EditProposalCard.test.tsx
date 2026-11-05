import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerEditProposal, AnswerSource } from '@/entities/answer'
import { useLocalEditStore } from '@/entities/document'
import { useChatStore } from '../model/chatStore'
import { isSampleEditRequest, sampleEditProposals } from '../lib/sampleEditProposals'
import { EditProposalCard } from './EditProposalCard'

const api = vi.hoisted(() => ({
  adminDownloadDocument: vi.fn(),
  adminGetDocument: vi.fn(),
  adminReviseDocument: vi.fn(),
  invalidateAfterDocumentChange: vi.fn(),
  isServerEditEnabled: vi.fn(() => false),
  downloadDocument: vi.fn(),
  fetchAllDocuments: vi.fn(),
}))

vi.mock('@/entities/document', async (original) => ({
  ...(await original<typeof import('@/entities/document')>()),
  ...api,
}))

const proposal: AnswerEditProposal = {
  chunkId: 'c1',
  source: '연차 지침',
  documentId: 'd1',
  versionId: 'v1',
  before: '최대 7일',
  after: '최대 5일',
  reason: '기준에 맞춤',
  peerDocumentIds: ['d2'],
}

function renderCard() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditProposalCard proposal={proposal} />
    </QueryClientProvider>,
  )
}

describe('EditProposalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DEV', true)
    useLocalEditStore.setState({ edits: {} })
    api.isServerEditEnabled.mockReturnValue(false)
    api.adminDownloadDocument.mockResolvedValue({ text: async () => '이월은 최대 7일이다.' })
  })

  it('변경을 고르면 로컬에만 저장한다', async () => {
    renderCard()
    expect(useLocalEditStore.getState().edits).toEqual({})
    await userEvent.click(screen.getByRole('button', { name: '변경' }))
    expect(await screen.findByRole('status')).toHaveTextContent('서버 문서와 답변은 그대로')
    expect(useLocalEditStore.getState().edits.d1).toEqual({
      title: '연차 지침',
      text: '이월은 최대 5일이다.',
      resolvedWith: ['d2'],
    })
  })

  it('같은 문서를 다시 수락해도 먼저 해소한 쌍을 유지하고, 직접 저장하면 지운다', () => {
    const { saveEdit } = useLocalEditStore.getState()
    saveEdit('d1', { title: 't', text: '1', resolvedWith: ['d2'] })
    saveEdit('d1', { title: 't', text: '2', resolvedWith: ['d3'] })
    expect(useLocalEditStore.getState().edits.d1?.resolvedWith).toEqual(['d2', 'd3'])
    saveEdit('d1', { title: 't', text: '3' })
    expect(useLocalEditStore.getState().edits.d1?.resolvedWith).toBeUndefined()
  })

  it('유지를 고르면 문서를 읽거나 바꾸지 않는다', async () => {
    renderCard()
    await userEvent.click(screen.getByRole('button', { name: '유지' }))
    expect(screen.getByRole('status')).toHaveTextContent('유지했습니다')
    expect(api.adminDownloadDocument).not.toHaveBeenCalled()
    expect(useLocalEditStore.getState().edits).toEqual({})
  })

  it('원문이 바뀌었으면 적용하지 않는다', async () => {
    api.adminDownloadDocument.mockResolvedValue({ text: async () => '다른 내용' })
    renderCard()
    await userEvent.click(screen.getByRole('button', { name: '변경' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('적용할 수 없습니다')
    expect(useLocalEditStore.getState().edits).toEqual({})
  })

  it('저장을 켜면 프로덕션에서 새 버전으로 저장하고 메모리에 두지 않는다', async () => {
    vi.stubEnv('DEV', false)
    api.isServerEditEnabled.mockReturnValue(true)
    api.adminGetDocument.mockResolvedValue({
      document: {
        id: 'd1',
        title: '연차 지침',
        relativePath: 'a/b.md',
        extension: 'md',
        author: '저자',
        authoredAt: null,
      },
    })
    api.adminReviseDocument.mockResolvedValue({ outcome: 'CREATED' })
    renderCard()
    await userEvent.click(screen.getByRole('button', { name: '변경' }))
    await waitFor(() => expect(api.adminReviseDocument).toHaveBeenCalledTimes(1))
    const [id, input] = api.adminReviseDocument.mock.lastCall as [string, { file: File }]
    expect(id).toBe('d1')
    expect(await input.file.text()).toBe('이월은 최대 5일이다.')
    expect(useLocalEditStore.getState().edits).toEqual({})
  })

  it('프로덕션에서는 저장 연결 전까지 변경할 수 없다', () => {
    vi.stubEnv('DEV', false)
    renderCard()
    expect(screen.getByRole('button', { name: '변경' })).toBeDisabled()
  })
})

describe('sampleEditProposals', () => {
  it('수정 요청 문구를 고른다', () => {
    expect(isSampleEditRequest('충돌 해결해줘')).toBe(true)
    expect(isSampleEditRequest('내용 맞춰줘')).toBe(true)
    expect(isSampleEditRequest('연차 며칠이야?')).toBe(false)
  })

  it('답변 출처에 대상 문서가 있을 때만 만든다', async () => {
    const source = { documentTitle: 'leave-operation' } as AnswerSource
    api.fetchAllDocuments.mockResolvedValue([{ id: 'd9', title: 'leave-operation' }])
    api.downloadDocument.mockResolvedValue({
      text: async () => '머리말\n이월은 최대 7일, 6월 30일까지다.\n끝',
    })
    const [proposal] = await sampleEditProposals([source])
    expect(proposal?.documentId).toBe('d9')
    expect(proposal?.before).toBe('이월은 최대 7일, 6월 30일까지다.')
    expect(proposal?.after).toBe('이월은 최대 5일, 3월 31일까지다.')
    expect(await sampleEditProposals([{ documentTitle: '다른 문서' } as AnswerSource])).toEqual([])
  })
})

describe('answerAboutConflict', () => {
  it('충돌을 물은 질문이거나 제안이 있을 때만 켜진다', () => {
    const { addQuestion, addAnswer } = useChatStore.getState()
    addQuestion('연차 이월 충돌이 뭐야?')
    addAnswer('c', '이월 한도가 문서마다 다릅니다.', [], [])
    expect(useChatStore.getState().answerAboutConflict).toBe(true)
    addQuestion('담당자가 누구야?')
    addAnswer('c', '담당은 영업본부장이고 문서끼리 충돌합니다.', [], [])
    expect(useChatStore.getState().answerAboutConflict).toBe(false)
    addAnswer('c', '제안입니다.', [], [], [], [proposal])
    expect(useChatStore.getState().answerAboutConflict).toBe(true)
  })
})
