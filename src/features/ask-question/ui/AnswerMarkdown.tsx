import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkKoreanStrong } from '../lib/remarkKoreanStrong'

// 답변 링크는 새 탭으로 열고, 열린 페이지가 이 창에 접근하지 못하게 합니다.
const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
}

/**
 * LLM 답변의 Markdown(제목, 굵게, 목록, 표, 코드 등)을 서식에 맞춰 보여줍니다.
 * 원시 HTML은 react-markdown 기본값대로 렌더링하지 않습니다.
 * 이미지는 답변에 섞인 외부 URL을 브라우저가 자동으로 요청하지 않도록 표시하지 않습니다.
 */
export function AnswerMarkdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none text-[15px] leading-relaxed text-[#e8e6e1] prose-headings:mt-3 prose-headings:mb-1.5 prose-p:my-1.5 prose-pre:my-2 prose-ol:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
      <Markdown
        remarkPlugins={[remarkGfm, remarkKoreanStrong]}
        disallowedElements={['img']}
        components={components}
      >
        {text}
      </Markdown>
    </div>
  )
}
