import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnswerMarkdown } from './AnswerMarkdown'

describe('AnswerMarkdown', () => {
  it('제목, 굵게, 목록을 서식으로 보여준다', () => {
    render(
      <AnswerMarkdown
        text={'## 연차 이월\n\n**최대 5일**까지 가능합니다.\n\n- 신청 필요\n- 팀장 승인'}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: '연차 이월' })).toBeInTheDocument()
    expect(screen.getByText('최대 5일').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText(/##|\*\*/)).not.toBeInTheDocument()
  })

  it('링크는 새 탭으로 안전하게 열고, 원시 HTML과 이미지는 렌더링하지 않는다', () => {
    const { container } = render(
      <AnswerMarkdown
        text={
          '[규정](https://example.com)\n\n<script>alert(1)</script>\n\n![x](https://example.com/a.png)'
        }
      />,
    )

    const link = screen.getByRole('link', { name: '규정' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })
})
