import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * react-pdf는 `onRenderTextLayerSuccess`가 바뀌면 텍스트 레이어를 지우고 다시 그립니다. 부모가 근거를 칠하느라
 * 다시 그려질 때마다 콜백이 새로 만들어지면 "다시 그림 → 알림 → 부모 갱신 → 다시 그림"이 끝없이 반복되므로
 * 페이지마다 고정된 콜백을 넘깁니다.
 */
const PdfPage = memo(function PdfPage({
  pageNumber,
  onTextLayer,
}: {
  pageNumber: number
  onTextLayer: (pageNumber: number) => void
}) {
  const handleTextLayer = useCallback(() => onTextLayer(pageNumber), [onTextLayer, pageNumber])
  return (
    <Page
      pageNumber={pageNumber}
      onRenderTextLayerSuccess={handleTextLayer}
      onRenderTextLayerError={handleTextLayer}
    />
  )
})

/**
 * 인증 헤더를 붙여 미리 받은 PDF 파일을 그립니다. react-pdf가 주소로 직접 받지 않게 합니다.
 * 근거는 페이지마다 그려지는 텍스트 레이어에서 찾으므로, 텍스트 레이어를 그릴 때마다 `onRendered`로
 * 알리고 모든 페이지를 다 그렸는지도 함께 넘깁니다.
 */
export default function PdfContent({
  file,
  onError,
  onRendered,
}: {
  file: Blob
  onError: () => void
  onRendered?: (complete: boolean) => void
}) {
  const [numPages, setNumPages] = useState(0)
  const renderedPages = useRef(new Set<number>())
  const numPagesRef = useRef(0)
  const onRenderedRef = useRef(onRendered)

  useEffect(() => {
    onRenderedRef.current = onRendered
    numPagesRef.current = numPages
  }, [onRendered, numPages])

  const handleTextLayer = useCallback((pageNumber: number) => {
    renderedPages.current.add(pageNumber)
    onRenderedRef.current?.(renderedPages.current.size >= numPagesRef.current)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Document
        file={file}
        suspense={false}
        loading={<p className="text-sm text-ink-muted">PDF를 불러오는 중…</p>}
        error={<p className="text-sm text-ink-muted">PDF를 불러오지 못했습니다.</p>}
        onLoadSuccess={({ numPages: count }) => setNumPages(count)}
        onLoadError={() => onError()}
        onSourceError={() => onError()}
      >
        {Array.from({ length: numPages }, (_, index) => (
          <PdfPage key={index + 1} pageNumber={index + 1} onTextLayer={handleTextLayer} />
        ))}
      </Document>
    </div>
  )
}
