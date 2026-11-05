import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerEditProposal } from '@/entities/answer'
import { useLocalEditStore } from '@/entities/document'
import { isSampleEditRequest, sampleEditProposals } from '../lib/sampleEditProposals'
import { EditProposalCard } from './EditProposalCard'

const api = vi.hoisted(() => ({ downloadDocument: vi.fn(), fetchAllDocuments: vi.fn() }))

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
}

describe('EditProposalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DEV', true)
    useLocalEditStore.setState({ edits: {} })
    api.downloadDocument.mockResolvedValue({ text: async () => '이월은 최대 7일이다.' })
  })

  it('변경을 고르면 로컬에만 저장한다', async () => {
    render(<EditProposalCard proposal={proposal} />)
    expect(useLocalEditStore.getState().edits).toEqual({})
    await userEvent.click(screen.getByRole('button', { name: '변경' }))
    expect(await screen.findByRole('status')).toHaveTextContent('서버 문서는 그대로')
    expect(useLocalEditStore.getState().edits.d1).toEqual({
      title: '연차 지침',
      text: '이월은 최대 5일이다.',
    })
  })

  it('유지를 고르면 문서를 읽거나 바꾸지 않는다', async () => {
    render(<EditProposalCard proposal={proposal} />)
    await userEvent.click(screen.getByRole('button', { name: '유지' }))
    expect(screen.getByRole('status')).toHaveTextContent('유지했습니다')
    expect(api.downloadDocument).not.toHaveBeenCalled()
    expect(useLocalEditStore.getState().edits).toEqual({})
  })

  it('원문이 바뀌었으면 적용하지 않는다', async () => {
    api.downloadDocument.mockResolvedValue({ text: async () => '다른 내용' })
    render(<EditProposalCard proposal={proposal} />)
    await userEvent.click(screen.getByRole('button', { name: '변경' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('적용할 수 없습니다')
    expect(useLocalEditStore.getState().edits).toEqual({})
  })

  it('프로덕션에서는 저장 연결 전까지 변경할 수 없다', () => {
    vi.stubEnv('DEV', false)
    render(<EditProposalCard proposal={proposal} />)
    expect(screen.getByRole('button', { name: '변경' })).toBeDisabled()
  })
})

describe('sampleEditProposals', () => {
  it('수정 요청 문구를 고른다', () => {
    expect(isSampleEditRequest('충돌 해결해줘')).toBe(true)
    expect(isSampleEditRequest('내용 맞춰줘')).toBe(true)
    expect(isSampleEditRequest('연차 며칠이야?')).toBe(false)
  })

  it('검색 결과와 무관하게 볼 수 있는 대상 문서로 만들고, 없으면 만들지 않는다', async () => {
    api.fetchAllDocuments.mockResolvedValue([{ id: 'd9', title: 'leave-operation' }])
    api.downloadDocument.mockResolvedValue({
      text: async () => '머리말\n이월은 최대 7일, 6월 30일까지다.\n끝',
    })
    const [proposal] = await sampleEditProposals()
    expect(proposal?.documentId).toBe('d9')
    expect(proposal?.before).toBe('이월은 최대 7일, 6월 30일까지다.')
    expect(proposal?.after).toBe('이월은 최대 5일, 3월 31일까지다.')
    api.fetchAllDocuments.mockResolvedValue([])
    expect(await sampleEditProposals()).toEqual([])
  })
})
