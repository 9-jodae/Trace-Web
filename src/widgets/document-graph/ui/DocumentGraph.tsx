import { lazy, Suspense, useCallback, useMemo } from 'react'
import { useChatStore } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'
import { useAllDocuments } from '@/entities/document'
import { toErrorMessage } from '@/shared/api'
import { buildDocumentGraph, type TypeLegendItem } from '../lib/buildGraph'

const SigmaCanvas = lazy(() => import('./SigmaCanvas'))

function supportsWebGL() {
  return typeof window !== 'undefined' && 'WebGL2RenderingContext' in window
}

/**
 * 볼 수 있는 모든 문서를 한꺼번에 노드로 표시하고 유형별로 색을 나눕니다.
 * 노드를 누르면 문서 탭을 열고, 가장 최근 답변의 근거 문서를 강조합니다.
 * 연결선은 서버의 문서 관계 그래프 API(#22)가 생기면 추가합니다.
 */
export function DocumentGraph() {
  const { data: documents, isPending, error, refetch } = useAllDocuments()
  const evidenceDocumentIds = useChatStore((state) => state.evidenceDocumentIds)
  const openDocument = useTabStore((state) => state.openDocument)

  const built = useMemo(
    () => (documents ? buildDocumentGraph({ documents, evidenceDocumentIds }) : null),
    [documents, evidenceDocumentIds],
  )

  const onNodeClick = useCallback(
    (documentId: string) => {
      const title = built?.graph.getNodeAttribute(documentId, 'label') ?? documentId
      openDocument({ documentId, title })
    },
    [built, openDocument],
  )

  if (isPending) return <Message>문서 그래프를 불러오는 중…</Message>
  if (error) {
    return (
      <Message>
        <p role="alert">{toErrorMessage(error)}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-slate-300 px-3 py-1"
        >
          다시 시도
        </button>
      </Message>
    )
  }
  if (!built || built.graph.order === 0) return <Message>볼 수 있는 문서가 없습니다.</Message>
  if (!supportsWebGL()) return <Message>이 브라우저에서는 그래프를 표시할 수 없습니다.</Message>

  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<Message>그래프를 준비하는 중…</Message>}>
        <SigmaCanvas graph={built.graph} onNodeClick={onNodeClick} />
      </Suspense>
      <Legend items={built.legend} />
    </div>
  )
}

function Legend({ items }: { items: TypeLegendItem[] }) {
  return (
    <ul
      aria-label="문서 유형 범례"
      className="absolute top-3 left-3 flex flex-col gap-1 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-xs"
    >
      {items.map((item) => (
        <li key={item.type ?? 'unclassified'} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {/* 유형 이름은 분류 체계가 정해지면 표시용 이름으로 바꿉니다. */}
          {item.type ?? '분류 전'} ({item.count})
        </li>
      ))}
    </ul>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
      {children}
    </div>
  )
}
