import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useCallback, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useQuoteHighlight } from '../lib/useQuoteHighlight'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * 인증 헤더를 붙여 미리 받은 PDF 파일을 그립니다. react-pdf가 주소로 직접 받지 않게 합니다.
 * 인용 문구는 pdf.js 텍스트 레이어(글자마다 페이지 좌표에 맞춰 놓인 투명 글자)에서 찾아 칠하므로,
 * 하이라이트가 PDF 원문의 글자 위치에 그대로 겹칩니다. 텍스트 레이어가 없는 스캔 PDF는 칠하지 못합니다.
 */
export default function PdfContent({
  file,
  quotes,
  onError,
}: {
  file: Blob
  /** 원문에서 칠할 인용 문구(가장 최근 답변). */
  quotes: string[]
  onError: () => void
}) {
  const [numPages, setNumPages] = useState(0)
  const { rootRef, apply } = useQuoteHighlight<HTMLDivElement>(quotes)
  // 앞 페이지가 덜 그려진 채로 스크롤하면 위치가 밀리므로, 모든 페이지 텍스트 레이어를 그린 뒤에 스크롤합니다.
  const renderedPagesRef = useRef(0)
  const handleTextLayerRendered = useCallback(() => {
    renderedPagesRef.current += 1
    apply(numPages > 0 && renderedPagesRef.current >= numPages)
  }, [apply, numPages])

  return (
    <div ref={rootRef} className="flex flex-col items-center gap-4 p-4">
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
          // 페이지 텍스트 레이어는 따로따로 늦게 그려지므로 그릴 때마다 다시 찾습니다.
          <Page
            key={index + 1}
            pageNumber={index + 1}
            onRenderTextLayerSuccess={handleTextLayerRendered}
          />
        ))}
      </Document>
    </div>
  )
}
