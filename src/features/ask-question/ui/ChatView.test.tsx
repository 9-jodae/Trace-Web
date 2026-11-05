import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NO_EVIDENCE_ANSWER, type AnswerEvidence, type AnswerSource } from '@/entities/answer'
import { fail, mockServer, ok } from '@/shared/testing'
import { resetChatStore, useChatStore } from '../model/chatStore'
import { ChatView } from './ChatView'

const source = (id: string, documentId: string): AnswerSource => ({
  id,
  text: '연차는 다음 해로 최대 5일까지 이월할 수 있다.',
  source: 'local',
  documentId,
  documentTitle: `문서 ${documentId}`,
  versionId: 'v1',
  charStart: 0,
  charEnd: 10,
})

const evidenceItem = (chunkId: string, documentId: string): AnswerEvidence => ({
  chunkId,
  source: `문서 ${documentId}`,
  documentId,
  versionId: 'v1',
  quote: '연차는 최대 5일까지 이월할 수 있다.',
  charStart: 10,
  charEnd: 20,
})

const answer = (
  conversationId: string,
  sources: AnswerSource[],
  evidence: AnswerEvidence[] = [],
  text = sources.length > 0 ? '최대 5일까지 이월할 수 있습니다.' : NO_EVIDENCE_ANSWER,
) => ({
  conversationId,
  answer: text,
  route: null,
  contextProbability: null,
  sources,
  evidence,
  failedSources: [],
  fallbackReason: null,
})

function renderChatWithContainer(onOpenSource = vi.fn<(source: AnswerSource) => void>()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ChatView onOpenSource={onOpenSource} />
    </QueryClientProvider>,
  )
}

function renderChat(onOpenSource = vi.fn<(source: AnswerSource) => void>()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ChatView onOpenSource={onOpenSource} />
    </QueryClientProvider>,
  )
  return onOpenSource
}

async function ask(text: string) {
  await userEvent.type(screen.getByLabelText('질문'), text)
  await userEvent.click(screen.getByRole('button', { name: '질문 보내기' }))
}

let restore: () => void = () => {}

describe('ChatView', () => {
  beforeEach(() => resetChatStore())
  afterEach(() => restore())

  it('첫 질문은 새 대화로, 다음 질문은 같은 대화로 보낸다', async () => {
    const urls: string[] = []
    restore = mockServer((config) => {
      urls.push(config.url ?? '')
      return ok(answer('c1', [source('k1', 'd1')]))
    })
    renderChat()

    await ask('연차 이월은?')
    expect(await screen.findByText('최대 5일까지 이월할 수 있습니다.')).toBeInTheDocument()
    await ask('반차도 되나요?')
    await screen.findAllByText('최대 5일까지 이월할 수 있습니다.')

    expect(urls).toEqual(['/api/conversations/messages', '/api/conversations/c1/messages'])
  })

  it('근거를 누르면 해당 출처를 넘긴다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')])))
    const onOpen = renderChat()

    await ask('연차 이월은?')
    await userEvent.click(await screen.findByRole('button', { name: /문서 d1/ }))

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', documentId: 'd1' }), [])
  })

  it('핵심 인용을 보여주고 누르면 그 문서를 넘긴다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')], [evidenceItem('e1', 'd1')])))
    const onOpen = renderChat()

    await ask('연차 이월은?')
    await userEvent.click(await screen.findByText(/연차는 최대 5일까지 이월할 수 있다/))

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1', documentId: 'd1' }), [
      evidenceItem('e1', 'd1').quote,
    ])
  })

  it('새 질문을 하면 이전 답변의 근거 강조를 지운다', async () => {
    let call = 0
    restore = mockServer(() => {
      call += 1
      return call === 1
        ? ok(answer('c1', [source('k1', 'd1'), source('k2', 'd1'), source('k3', 'd2')]))
        : fail(502, 'AI_UNAVAILABLE')
    })
    renderChat()

    await ask('첫 질문')
    await screen.findByText('최대 5일까지 이월할 수 있습니다.')
    expect(useChatStore.getState().evidenceDocumentIds).toEqual(['d1', 'd2'])

    await ask('두 번째 질문')
    expect(await screen.findByRole('alert')).toHaveTextContent('AI 서버에 연결할 수 없습니다')
    expect(useChatStore.getState().evidenceDocumentIds).toEqual([])
  })

  // "새 대화" 버튼은 widgets/sidebar로 옮겨졌으므로 여기서는 스토어 동작만 확인합니다.
  it('새 대화를 시작하면 대화 내용과 대화 ID를 지운다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')])))
    renderChat()

    await ask('질문')
    await screen.findByText('최대 5일까지 이월할 수 있습니다.')
    act(() => useChatStore.getState().startNewConversation())

    expect(screen.queryByText('최대 5일까지 이월할 수 있습니다.')).not.toBeInTheDocument()
    expect(useChatStore.getState().conversationId).toBeNull()
  })

  it('근거가 없어도 답변 문장을 그대로 보여주고 재시도 버튼을 함께 보여준다', async () => {
    restore = mockServer(() => ok(answer('c1', [])))
    renderChat()

    await ask('환율 기준일은?')

    expect(await screen.findByText(NO_EVIDENCE_ANSWER)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '필터 해제하고 다시 찾기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다른 표현으로 질문' })).toBeInTheDocument()
  })

  it('근거를 누르면 그 청크의 핵심 문장과 키워드를 함께 넘긴다', async () => {
    restore = mockServer(() =>
      ok({
        ...answer('c1', [source('k1', 'd1')], [evidenceItem('k1', 'd1')]),
        keywords: [
          { text: '최대 5일', chunkId: 'k1' },
          { text: '다른 청크', chunkId: 'k2' },
        ],
      }),
    )
    const onOpenSource = renderChat()

    await ask('연차 이월은?')
    await userEvent.click(await screen.findByRole('button', { name: /^1\s*문서 d1/ }))

    const quote = evidenceItem('k1', 'd1').quote
    expect(onOpenSource).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }), [
      quote,
      '최대 5일',
    ])
  })

  it('근거가 없어도 거절 문장이 아니면 답변 문장을 그대로 보여준다', async () => {
    const text = '어떤 기간에 관한 질문인가요? 좀 더 자세히 말씀해 주세요.'
    restore = mockServer(() => ok(answer('c1', [], [], text)))
    renderChat()

    await ask('기간이 얼마나 됨?')

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다른 표현으로 질문' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '근거' })).not.toBeInTheDocument()
  })

  it('"다른 표현으로 질문"을 누르면 원래 질문을 입력창에 채운다', async () => {
    restore = mockServer(() => ok(answer('c1', [])))
    renderChat()

    await ask('환율 기준일은?')
    await userEvent.click(await screen.findByRole('button', { name: '다른 표현으로 질문' }))

    expect(screen.getByLabelText('질문')).toHaveValue('환율 기준일은?')
  })

  it('"필터 해제하고 다시 찾기"를 누르면 필터를 지우고 같은 질문을 다시 보낸다', async () => {
    const urls: string[] = []
    restore = mockServer((config) => {
      urls.push(config.url ?? '')
      return ok(answer('c1', []))
    })
    const onClearFilters = vi.fn<() => void>()
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ChatView
          onOpenSource={vi.fn<(source: AnswerSource) => void>()}
          onClearFilters={onClearFilters}
        />
      </QueryClientProvider>,
    )

    await ask('환율 기준일은?')
    await userEvent.click(await screen.findByRole('button', { name: '필터 해제하고 다시 찾기' }))

    await screen.findAllByText(NO_EVIDENCE_ANSWER)
    expect(onClearFilters).toHaveBeenCalledTimes(1)
    expect(urls).toEqual(['/api/conversations/messages', '/api/conversations/c1/messages'])
  })

  it('답변을 기다리는 동안 상대 말풍선에 입력 중 표시와 입력창 위 생성 중 문구를 보여준다', async () => {
    let respond: (reply: ReturnType<typeof ok>) => void = () => {}
    restore = mockServer(
      () =>
        new Promise((resolve) => {
          respond = resolve
        }),
    )
    renderChat()

    await ask('연차 이월은?')

    expect(await screen.findByRole('status')).toHaveTextContent('근거를 찾고 답변을 만들고 있어요')
    expect(screen.getByText('가 답변을 생성 중…', { exact: false })).toBeInTheDocument()

    await act(async () => respond(ok(answer('c1', [source('k1', 'd1')]))))

    expect(await screen.findByText('최대 5일까지 이월할 수 있습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('가 답변을 생성 중…', { exact: false })).not.toBeInTheDocument()
  })

  it('답변 말풍선에 상대 이름을, 질문과 답변 옆에 보낸 시각을 보여준다', async () => {
    restore = mockServer(() => ok(answer('c1', [source('k1', 'd1')])))
    const { container } = renderChatWithContainer()

    await ask('연차 이월은?')
    await screen.findByText('최대 5일까지 이월할 수 있습니다.')

    expect(screen.getByText('문서119')).toBeInTheDocument()
    expect(container.querySelectorAll('time')).toHaveLength(2)
  })

  it('오류가 연달아 오면 프로필과 이름은 첫 말풍선에만 보여준다', async () => {
    act(() =>
      useChatStore.getState().loadConversation('c1', [
        { id: 'q1', kind: 'question', text: '질문' },
        { id: 'a1', kind: 'answer', text: '첫 답변', sources: [], evidence: [] },
        { id: 'e1', kind: 'error', text: '오류가 났습니다' },
      ]),
    )
    renderChat()

    expect(screen.getAllByText('문서119')).toHaveLength(1)
    // 시각이 없는 옛 메시지에는 시각을 그리지 않습니다.
    expect(screen.queryByRole('time')).not.toBeInTheDocument()
  })

  it('답변을 기다리는 중에 다른 대화를 열면 그 대화에는 입력 중 표시를 띄우지 않는다', async () => {
    restore = mockServer(() => new Promise(() => {}))
    renderChat()

    await ask('연차 이월은?')
    expect(await screen.findByRole('status')).toBeInTheDocument()

    act(() =>
      useChatStore
        .getState()
        .loadConversation('c2', [{ id: 'q1', kind: 'question', text: '다른 대화 질문' }]),
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('가 답변을 생성 중…', { exact: false })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('질문'), '새 질문')
    expect(screen.getByRole('button', { name: '질문 보내기' })).toBeEnabled()
  })
})
