import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** 인증 헤더를 붙여 미리 받은 PDF 파일을 그립니다. react-pdf가 주소로 직접 받지 않게 합니다. */
export default function PdfContent({ file, onError }: { file: Blob; onError: () => void }) {
  const [numPages, setNumPages] = useState(0)

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
          <Page key={index + 1} pageNumber={index + 1} />
        ))}
      </Document>
    </div>
  )
}
