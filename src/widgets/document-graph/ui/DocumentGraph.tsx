import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { Sigma } from 'sigma'
import { useChatStore } from '@/features/ask-question'
import { useTabStore } from '@/features/document-tabs'
import { useDocumentFilterStore, filterDocuments, FilterBar } from '@/features/filter-documents'
import { useAllDocuments, documentTypeLabel, useLocalEditStore } from '@/entities/document'
import { useGraph } from '@/entities/graph'
import { toErrorMessage } from '@/shared/api'
import { describeEdge, focusConflictDocuments, type EdgeDetailItem } from '../lib/edgeDetail'
import { ANSWER_SEGMENT_MS, answerPathDuration, answerPathSegments } from '../lib/answerPath'
import {
  buildDocumentGraph,
  conflictWarning,
  type DocumentLink,
  type TypeLegendItem,
} from '../lib/buildGraph'
import type { NodeHover } from './SigmaCanvas'

const SigmaCanvas = lazy(() => import('./SigmaCanvas'))

function supportsWebGL() {
  return typeof window !== 'undefined' && 'WebGL2RenderingContext' in window
}

/**
 * 볼 수 있는 모든 문서를 한꺼번에 노드로 표시하고 유형별로 색을 나눕니다.
 * 문서마다 가장 중요한 선 하나만 그리고, 노드를 누르면 그 문서의 선을 모두 보이며 오른쪽 패널에
 * 문서를 띄웁니다. 가장 최근 답변의 근거 문서를 강조합니다.
 * 연결선은 문서 관계 그래프 API(GET /api/graph, Issue #22)에서 가져옵니다. 이 요청이 실패해도
 * 노드 목록 자체는 /api/documents로 따로 받으므로, 연결선만 없이 그래프는 그대로 보여줍니다.
 */
export function DocumentGraph() {
  const { data: documents, isPending, error, refetch } = useAllDocuments()
  const { data: graphData } = useGraph()
  const evidenceDocumentIds = useChatStore((state) => state.evidenceDocumentIds)
  const answerAboutConflict = useChatStore((state) => state.answerAboutConflict)
  const graphHighlightEnabled = useChatStore((state) => state.graphHighlightEnabled)
  const openPreview = useTabStore((state) => state.openPreview)
  const closePreview = useTabStore((state) => state.closePreview)
  const preview = useTabStore((state) => state.preview)
  const { filter } = useDocumentFilterStore()
  const localEdits = useLocalEditStore((state) => state.edits)
  const modifiedDocuments = useMemo(
    () =>
      Object.entries(localEdits)
        .filter(([, edit]) => !edit.resolvedWith)
        .map(([id, edit]) => ({ id, title: edit.title })),
    [localEdits],
  )
  const resolvedPairs = useMemo(
    () =>
      Object.entries(localEdits).flatMap(([id, edit]) =>
        (edit.resolvedWith ?? []).map((peer): [string, string] => [id, peer]),
      ),
    [localEdits],
  )

  const filteredDocuments = useMemo(
    () => (documents ? filterDocuments(documents, filter) : undefined),
    [documents, filter],
  )
  const noEvidence = useMemo(() => [] as string[], [])
  const effectiveEvidenceIds = useMemo(
    () =>
      !graphHighlightEnabled
        ? noEvidence
        : answerAboutConflict
          ? focusConflictDocuments(evidenceDocumentIds, graphData?.edges ?? [], resolvedPairs)
          : evidenceDocumentIds,
    [
      graphHighlightEnabled,
      answerAboutConflict,
      evidenceDocumentIds,
      graphData,
      noEvidence,
      resolvedPairs,
    ],
  )
  const links = useMemo<DocumentLink[]>(
    () =>
      (graphData?.edges ?? []).map((edge) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label:
          edge.type === 'CONFLICTS'
            ? conflictWarning(edge.detail && 'item' in edge.detail ? edge.detail.item : undefined)
            : edge.label,
        securityRisk: edge.warnings?.some((warning) => warning.type === 'SECURITY_RISK'),
      })),
    [graphData],
  )

  // 사용자가 끌어서 옮긴 노드의 위치만 기억해 둡니다. 새 답변·필터 변경으로 그래프를 다시
  // 만들 때 이 위치를 넘겨, 옮긴 노드가 계산된 자리로 돌아가지 않게 합니다.
  // 직전 그래프의 모든 노드 위치를 넘기면 안 됩니다: 배치는 목록 순서(index)로만 정해져서,
  // 필터 해제·업로드로 새로 들어온 문서가 기존 노드가 붙잡고 있는 자리를 그대로 받아 겹칩니다.
  const draggedPositionsRef = useRef(new Map<string, { x: number; y: number }>())

  const built = useMemo(() => {
    if (!filteredDocuments) return null
    return buildDocumentGraph({
      documents: filteredDocuments,
      links,
      evidenceDocumentIds: effectiveEvidenceIds,
      positionOverrides: draggedPositionsRef.current,
      modifiedDocuments,
      resolvedPairs,
    })
  }, [filteredDocuments, links, effectiveEvidenceIds, modifiedDocuments, resolvedPairs])

  const [sigma, setSigma] = useState<Sigma | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const edgeDetail = useMemo(() => {
    if (!built || !selectedEdge || !built.graph.hasEdge(selectedEdge)) return null
    const [source, target] = built.graph.extremities(selectedEdge) as [string, string]
    const titleOf = (id: string) =>
      built.graph.hasNode(id) ? built.graph.getNodeAttribute(id, 'label') : id
    return {
      source,
      target,
      title: `${titleOf(source)} ↔ ${titleOf(target)}`,
      items: describeEdge({
        source,
        target,
        edges: graphData?.edges ?? [],
        titleOf,
        modifiedDocuments,
        resolvedPairs,
      }),
    }
  }, [built, selectedEdge, graphData, modifiedDocuments, resolvedPairs])

  // 드래그가 끝나면 sigma 그래프에 반영된 최종 좌표를 기억합니다.
  useEffect(() => {
    if (!sigma) return
    const remember = ({ allDraggedNodes }: { allDraggedNodes: string[] }) => {
      const graph = sigma.getGraph()
      for (const node of allDraggedNodes) {
        if (!graph.hasNode(node)) continue
        const { x, y } = graph.getNodeAttributes(node)
        draggedPositionsRef.current.set(node, { x, y })
      }
    }
    sigma.on('nodeDragEnd', remember)
    return () => {
      sigma.off('nodeDragEnd', remember)
    }
  }, [sigma])

  const [hover, setHover] = useState<NodeHover | null>(null)
  const [badges, setBadges] = useState<
    { documentId: string; order: number; x: number; y: number }[]
  >([])
  const [rings, setRings] = useState<
    { documentId: string; x: number; y: number; radius: number }[]
  >([])

  const onReady = useCallback((instance: Sigma) => setSigma(instance), [])

  // 그래프를 다시 그릴 때마다(새 답변, 필터 변경, 그래프 탭을 다시 열 때) 근거 1번 노드부터 다음 노드까지
  // 선이 차례로 그어지는 애니메이션을 보여 줍니다. 움직임을 줄이도록 설정한 사용자에게는 건너뜁니다.
  const answerKey = effectiveEvidenceIds.join(',')
  const answerNodes = built
    ? effectiveEvidenceIds.filter((id) => built.graph.hasNode(id)).length
    : 0
  const [drawn, setDrawn] = useState<{ graph: unknown; sigma: unknown } | null>(null)
  const drawingAnswer =
    sigma !== null &&
    built !== null &&
    answerNodes > 1 &&
    (drawn?.graph !== built.graph || drawn?.sigma !== sigma) &&
    !prefersReducedMotion()
  useEffect(() => {
    if (!drawingAnswer || !built) return
    const timer = window.setTimeout(
      () => setDrawn({ graph: built.graph, sigma }),
      answerPathDuration(answerNodes - 1),
    )
    return () => window.clearTimeout(timer)
  }, [drawingAnswer, built, sigma, answerNodes])

  // 근거 노드 배지·링 글로우는 카메라(줌·팬)가 바뀔 때마다 화면 좌표를 다시 계산해야 제자리에 붙어 있습니다.
  useEffect(() => {
    if (!sigma || effectiveEvidenceIds.length === 0) {
      setBadges([])
      setRings([])
      return
    }
    const recompute = () => {
      const nextBadges: { documentId: string; order: number; x: number; y: number }[] = []
      const nextRings: { documentId: string; x: number; y: number; radius: number }[] = []
      effectiveEvidenceIds.forEach((documentId, index) => {
        const display = sigma.getNodeDisplayData(documentId)
        if (!display) return
        const { x, y } = sigma.framedGraphToViewport(display)
        nextBadges.push({ documentId, order: index + 1, x, y })
        nextRings.push({ documentId, x, y, radius: sigma.scaleSize(display.size) })
      })
      setBadges(nextBadges)
      setRings(nextRings)
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

  // 노드를 누르면 그 문서의 선을 모두 보이고, 그래프를 가리지 않게 오른쪽 패널에 문서를 띄웁니다.
  // 고른 노드는 미리보기와 같은 값을 써서, 미리보기를 닫으면 선도 기본 보기로 돌아갑니다.
  const onNodeClick = useCallback(
    (documentId: string) => {
      const title = built?.graph.getNodeAttribute(documentId, 'label') ?? documentId
      openPreview({ documentId, title })
    },
    [built, openPreview],
  )
  const previewId = preview?.documentId
  const shownNode = previewId && built?.graph.hasNode(previewId) ? previewId : null

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
      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-surface"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 30% 20%, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 70%), radial-gradient(45% 50% at 85% 85%, rgba(29,78,216,0.12) 0%, rgba(29,78,216,0) 70%)',
        }}
      >
        {!built || built.graph.order === 0 ? (
          <Message>볼 수 있는 문서가 없습니다.</Message>
        ) : !supportsWebGL() ? (
          <Message>이 브라우저에서는 그래프를 표시할 수 없습니다.</Message>
        ) : (
          <>
            {/*
              캔버스(노드·연결선과 캔버스에 그려지는 라벨)에만 효과를 입힙니다. 범례·툴팁·확대 버튼 같은
              패널은 이 바깥에 둬서 또렷하게 유지합니다.
              drop-shadow는 캔버스의 투명 배경 위에서 각 원의 알파 윤곽을 따라가므로,
              블러를 아주 작게 주면 원마다 테두리처럼 보이는 효과를 낼 수 있습니다.
              - 1px 밝은 림(테두리 강조) + 4px 블루 글로우(은은한 색 강조) + 아래로 치우친 어두운
              그림자(왼쪽 위에서 빛이 오는 것처럼 보이게 해 입체감을 더함), 세 겹을 쌓았습니다.
            */}
            <div
              className="size-full"
              style={{
                filter:
                  'drop-shadow(0 0 1px rgba(226,232,240,0.85)) drop-shadow(0 0 4px rgba(96,165,250,0.4)) drop-shadow(1px 2px 2px rgba(0,0,0,0.5))',
              }}
            >
              <Suspense fallback={<Message>그래프를 준비하는 중…</Message>}>
                <SigmaCanvas
                  graph={built.graph}
                  onNodeClick={onNodeClick}
                  onEdgeClick={setSelectedEdge}
                  onNodeHover={setHover}
                  onReady={onReady}
                  onStageClick={closePreview}
                  selectedNode={shownNode}
                  drawingAnswer={drawingAnswer}
                />
              </Suspense>
            </div>
            {/* 범례는 서버가 보낸 전체 링크가 아니라 실제로 그려진 엣지 기준입니다(같은 문서
                쌍에 참조·충돌이 둘 다 있으면 충돌 선만 그려지므로, 범례도 그에 맞춰야 합니다). */}
            <Legend
              items={built.legend}
              hasReferences={built.hasReferences}
              hasConflicts={built.hasConflicts}
              hasWarnings={built.hasWarnings}
              hasTopics={built.hasTopics}
              hasEvidenceLinks={built.hasEvidenceLinks}
            />
            <ZoomControls sigma={sigma} />
            {drawingAnswer && (
              // 필터를 바꿔 그래프를 다시 그리면 애니메이션도 처음부터 다시 그립니다
              <AnswerPath key={`${answerKey}|${filteredDocuments?.length ?? 0}`} points={badges} />
            )}
            {rings.map((ring) => (
              <NodeRing key={ring.documentId} x={ring.x} y={ring.y} radius={ring.radius} />
            ))}
            {badges.map((badge) => (
              <EvidenceBadge key={badge.documentId} order={badge.order} x={badge.x} y={badge.y} />
            ))}
            {edgeDetail && (
              <EdgeDetailPanel
                title={edgeDetail.title}
                items={edgeDetail.items}
                onClose={() => setSelectedEdge(null)}
              />
            )}
            {hover && built.graph.hasNode(hover.nodeId) && (
              <HoverTooltip hover={hover} graph={built.graph} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** 선을 눌렀을 때 두 문서 사이의 관계와 문제를 보여 줍니다. */
function EdgeDetailPanel({
  title,
  items,
  onClose,
}: {
  title: string
  items: EdgeDetailItem[]
  onClose: () => void
}) {
  return (
    <section
      aria-label="관계 내용"
      className="absolute right-3 bottom-3 z-10 flex max-h-[60%] w-80 flex-col gap-2 overflow-y-auto rounded-xl border border-blue-400/20 bg-surface-raised p-3 text-sm text-ink"
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" aria-label="닫기" onClick={onClose} className="text-ink-muted">
          <X className="size-4" aria-hidden />
        </button>
      </header>
      {items.map((item, index) => (
        <EdgeDetailRow key={`${item.kind}-${index}`} item={item} />
      ))}
    </section>
  )
}

function EdgeDetailRow({ item }: { item: EdgeDetailItem }) {
  switch (item.kind) {
    case 'CONFLICT':
      return (
        <div className="rounded-md bg-red-400/10 p-2">
          <p className="font-semibold text-red-300">경고! 내용 충돌 · {item.item}</p>
          <ul className="mt-1 text-ink-dim">
            {item.values.map(({ title, value }) => (
              <li key={title}>
                {title}: <strong className="text-ink">{value}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-ink-muted">어느 값이 맞는지 담당자 확인이 필요합니다.</p>
        </div>
      )
    case 'MODIFIED':
      return (
        <div className="rounded-md bg-red-400/10 p-2">
          <p className="font-semibold text-red-300">경고! 내용 확인 필요</p>
          <p className="mt-1 text-ink-dim">
            {item.modifiedTitle}이(가) 수정됐습니다. 이 문서를 참조하는 {item.referrerTitle}의
            내용을 다시 확인해 주세요.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            수정 여부만 본 경고이며 실제 내용을 비교한 결과는 아닙니다.
          </p>
        </div>
      )
    case 'SECURITY':
      return (
        <div className="rounded-md bg-red-400/10 p-2">
          <p className="font-semibold text-red-300">경고! 보안 위험 · 열람 등급 불일치</p>
          <p className="mt-1 text-ink-dim">
            {item.fromTitle}의 보안 등급이 참조하는 {item.toTitle}보다 낮습니다. 높은 등급 내용이
            담겨 있지 않은지 확인해 주세요.
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            등급만 비교한 경고이며 실제 내용을 비교한 결과는 아닙니다.
          </p>
        </div>
      )
    case 'TOPIC':
      return <p className="text-ink-dim">같은 주제: {item.topics.join(', ')}</p>
    case 'REFERENCE':
      return (
        <p className="text-ink-dim">
          {item.fromTitle}이(가) {item.toTitle}을(를) 참조합니다.
        </p>
      )
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

/** 근거 노드를 근거 순서대로 잇는 선이 차례로 그어지는 애니메이션. 끝나면 실제 답변 선으로 바뀝니다. */
function AnswerPath({ points }: { points: { documentId: string; x: number; y: number }[] }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full">
      {answerPathSegments(points).map((segment) => (
        <line
          key={segment.key}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          pathLength={1}
          className="graph-answer-line"
          style={{ animationDelay: `${segment.order * ANSWER_SEGMENT_MS}ms` }}
        />
      ))}
    </svg>
  )
}

/** 근거 노드를 감싸는 링 글로우. 노드 자체는 평범한 원이라 이 링으로 "타겟" 느낌을 더합니다. */
function NodeRing({ x, y, radius }: { x: number; y: number; radius: number }) {
  const diameter = radius * 2 + 12
  return (
    <div
      className="graph-ring-pulse pointer-events-none absolute rounded-full border-2 border-sky-300/70"
      style={{
        left: x,
        top: y,
        width: diameter,
        height: diameter,
        boxShadow: '0 0 18px 2px rgba(96,165,250,0.55), inset 0 0 12px rgba(96,165,250,0.35)',
      }}
    />
  )
}

function EvidenceBadge({ order, x, y }: { order: number; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sky-200 text-[11px] font-semibold text-[#0b1220] shadow-[0_0_0_4px_rgba(96,165,250,0.25),0_0_16px_rgba(96,165,250,0.6)]"
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
      className="pointer-events-none absolute z-10 flex max-w-64 flex-col gap-1 rounded-xl border border-blue-400/20 bg-surface-raised/95 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_24px_rgba(59,130,246,0.15)] backdrop-blur-sm"
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
        className="flex size-10 items-center justify-center rounded-[10px] border border-blue-400/20 bg-surface-raised/90 text-ink-dim backdrop-blur-sm transition-colors hover:border-blue-400/40 hover:text-ink hover:shadow-[0_0_16px_rgba(59,130,246,0.25)]"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="축소"
        onClick={() => sigma?.getCamera().zoomOut()}
        className="flex size-10 items-center justify-center rounded-[10px] border border-blue-400/20 bg-surface-raised/90 text-ink-dim backdrop-blur-sm transition-colors hover:border-blue-400/40 hover:text-ink hover:shadow-[0_0_16px_rgba(59,130,246,0.25)]"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

function Legend({
  items,
  hasReferences,
  hasConflicts,
  hasWarnings,
  hasTopics,
  hasEvidenceLinks,
}: {
  items: TypeLegendItem[]
  hasReferences: boolean
  hasConflicts: boolean
  hasWarnings: boolean
  hasTopics: boolean
  hasEvidenceLinks: boolean
}) {
  return (
    <ul
      aria-label="문서 유형 범례"
      className="absolute top-3 left-3 flex flex-col gap-1 rounded-md border border-blue-400/15 bg-surface-raised/90 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_20px_rgba(59,130,246,0.08)] backdrop-blur-sm"
    >
      {items.map((item) => (
        <li key={item.type ?? 'unclassified'} className="flex items-center gap-2 text-ink-dim">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }}
          />
          {item.label} ({item.count})
        </li>
      ))}
      {(hasReferences || hasConflicts || hasTopics || hasWarnings || hasEvidenceLinks) && (
        <>
          <li aria-hidden className="my-0.5 border-t border-border-dark" />
          {hasReferences && (
            <li className="flex items-center gap-2 text-ink-dim">
              <span className="h-0.5 w-3 rounded-full bg-[rgb(96,165,250)]" />
              참조
            </li>
          )}
          {hasWarnings && (
            <li className="flex items-center gap-2 text-ink-dim">
              <span className="h-0.5 w-3 rounded-full bg-[rgb(248,113,113)]" />
              경고
            </li>
          )}
          {hasConflicts && (
            <li className="flex items-center gap-2 text-ink-dim">
              <span className="h-0.5 w-3 rounded-full bg-[rgb(248,113,113)]" />
              경고: 내용 충돌
            </li>
          )}
          {hasEvidenceLinks && (
            <li className="flex items-center gap-2 text-ink-dim">
              <span className="h-0.5 w-3 rounded-full bg-[rgb(186,230,253)]" />
              답변 근거
            </li>
          )}
          {hasTopics && (
            <li className="flex items-center gap-2 text-ink-dim">
              <span className="h-0.5 w-3 rounded-full bg-[rgb(45,212,191)]" />
              같은 주제
            </li>
          )}
        </>
      )}
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
