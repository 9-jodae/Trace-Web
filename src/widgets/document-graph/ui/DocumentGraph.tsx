import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { Sigma } from 'sigma'
import { useChatStore } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'
import { useDocumentFilterStore, filterDocuments, FilterBar } from '@/features/filter-documents'
import { useAllDocuments, documentTypeLabel } from '@/entities/document'
import { toErrorMessage } from '@/shared/api'
import { buildDocumentGraph, type TypeLegendItem } from '../lib/buildGraph'
import type { NodeHover } from './SigmaCanvas'

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
  const graphHighlightEnabled = useChatStore((state) => state.graphHighlightEnabled)
  const openDocument = useTabStore((state) => state.openDocument)
  const { filter } = useDocumentFilterStore()

  const filteredDocuments = useMemo(
    () => (documents ? filterDocuments(documents, filter) : undefined),
    [documents, filter],
  )
  const noEvidence = useMemo(() => [] as string[], [])
  const effectiveEvidenceIds = graphHighlightEnabled ? evidenceDocumentIds : noEvidence

  const built = useMemo(
    () =>
      filteredDocuments
        ? buildDocumentGraph({
            documents: filteredDocuments,
            evidenceDocumentIds: effectiveEvidenceIds,
          })
        : null,
    [filteredDocuments, effectiveEvidenceIds],
  )

  const [sigma, setSigma] = useState<Sigma | null>(null)
  const [hover, setHover] = useState<NodeHover | null>(null)
  const [badges, setBadges] = useState<
    { documentId: string; order: number; x: number; y: number }[]
  >([])

  const onReady = useCallback((instance: Sigma) => setSigma(instance), [])

  // 근거 노드 배지는 카메라(줌·팬)가 바뀔 때마다 화면 좌표를 다시 계산해야 제자리에 붙어 있습니다.
  useEffect(() => {
    if (!sigma || effectiveEvidenceIds.length === 0) {
      setBadges([])
      return
    }
    const recompute = () => {
      const next = effectiveEvidenceIds.flatMap((documentId, index) => {
        const display = sigma.getNodeDisplayData(documentId)
        if (!display) return []
        const { x, y } = sigma.framedGraphToViewport(display)
        return [{ documentId, order: index + 1, x, y }]
      })
      setBadges(next)
    }
    recompute()
    const camera = sigma.getCamera()
    camera.on('updated', recompute)
    sigma.on('afterRender', recompute)
    return () => {
      camera.off('updated', recompute)
      sigma.off('afterRender', recompute)
    }
  }, [sigma, effectiveEvidenceIds])

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
          className="rounded-md border border-border-dark-strong px-3 py-1"
        >
          다시 시도
        </button>
      </Message>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FilterBar />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-surface">
        {!built || built.graph.order === 0 ? (
          <Message>볼 수 있는 문서가 없습니다.</Message>
        ) : !supportsWebGL() ? (
          <Message>이 브라우저에서는 그래프를 표시할 수 없습니다.</Message>
        ) : (
          <>
            <Suspense fallback={<Message>그래프를 준비하는 중…</Message>}>
              <SigmaCanvas
                graph={built.graph}
                onNodeClick={onNodeClick}
                onNodeHover={setHover}
                onReady={onReady}
              />
            </Suspense>
            <Legend items={built.legend} />
            <ZoomControls sigma={sigma} />
            {badges.map((badge) => (
              <EvidenceBadge key={badge.documentId} order={badge.order} x={badge.x} y={badge.y} />
            ))}
            {hover && built.graph.hasNode(hover.nodeId) && (
              <HoverTooltip hover={hover} graph={built.graph} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EvidenceBadge({ order, x, y }: { order: number; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[11px] font-semibold text-[#111110] shadow-[0_0_0_3px_rgba(255,255,255,0.15)]"
      style={{ left: x, top: y }}
    >
      {order}
    </div>
  )
}

function HoverTooltip({
  hover,
  graph,
}: {
  hover: NodeHover
  graph: import('graphology').default<import('../lib/buildGraph').NodeAttributes>
}) {
  const attrs = graph.getNodeAttributes(hover.nodeId)
  return (
    <div
      className="pointer-events-none absolute z-10 flex max-w-64 flex-col gap-1 rounded-xl border border-border-dark-strong bg-surface-raised px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
      style={{ left: hover.x + 14, top: hover.y + 14 }}
    >
      <p className="text-sm font-semibold text-ink">{attrs.label}</p>
      <p className="text-xs text-ink-dim">
        {documentTypeLabel(attrs.documentType)} · .{attrs.extension}
        {attrs.authoredAt ? ` · ${attrs.authoredAt}` : ''}
      </p>
    </div>
  )
}

function ZoomControls({ sigma }: { sigma: Sigma | null }) {
  return (
    <div className="absolute right-4 bottom-4 flex flex-col gap-2">
      <button
        type="button"
        aria-label="확대"
        onClick={() => sigma?.getCamera().zoomIn()}
        className="flex size-10 items-center justify-center rounded-[10px] border border-border-dark-strong bg-surface-raised text-ink-dim hover:text-ink"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="축소"
        onClick={() => sigma?.getCamera().zoomOut()}
        className="flex size-10 items-center justify-center rounded-[10px] border border-border-dark-strong bg-surface-raised text-ink-dim hover:text-ink"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

function Legend({ items }: { items: TypeLegendItem[] }) {
  return (
    <ul
      aria-label="문서 유형 범례"
      className="absolute top-3 left-3 flex flex-col gap-1 rounded-md border border-border-dark-strong bg-surface-raised/90 px-3 py-2 text-xs"
    >
      {items.map((item) => (
        <li key={item.type ?? 'unclassified'} className="flex items-center gap-2 text-ink-dim">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label} ({item.count})
        </li>
      ))}
    </ul>
  )
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface text-sm text-ink-muted">
      {children}
    </div>
  )
}
