# 라이브러리 선택

초기 설정에서 고른 라이브러리와 이유입니다. 같은 역할의 라이브러리를 추가하기 전에는 팀과 먼저 논의합니다.

| 역할             | 라이브러리                              | 이유                                                             |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------- |
| 빌드·개발 서버   | Vite, TypeScript                        | 빠른 개발 서버, React 공식 권장 템플릿                           |
| 라우팅           | React Router                            | 화면 수가 적고 표준적인 선택                                     |
| 서버 상태        | TanStack Query                          | 캐시, 재시도, 로딩·오류 상태 관리                                |
| HTTP             | axios                                   | 인터셉터로 토큰 주입, 서버 응답 봉투 처리                        |
| 화면 상태        | Zustand                                 | 탭, 하이라이트처럼 여러 컴포넌트가 공유하는 상태를 가볍게 관리   |
| 스타일           | Tailwind CSS, clsx                      | 별도 CSS 파일 없이 빠르게 화면 구성                              |
| 분할 레이아웃    | react-resizable-panels                  | VS Code처럼 탭 영역과 채팅 패널 너비 조절                        |
| 문서 관계 그래프 | Sigma.js, graphology, @react-sigma/core | WebGL로 그려 문서 수천 개도 버벅이지 않음 (기획서 F5)            |
| PDF 원문 뷰어    | react-pdf                               | 페이지 렌더링과 텍스트 레이어로 근거 구절 하이라이트 (기획서 F4) |
| Markdown 원문    | react-markdown, remark-gfm              | Notion·Obsidian·MD 문서 표시                                     |
| 아이콘           | lucide-react                            | 가볍고 일관된 아이콘 세트                                        |
| 린트·포맷        | oxlint, Prettier                        | Vite 기본 템플릿의 oxlint, 코드 정렬은 Prettier                  |
| 구조 검사        | Steiger, @feature-sliced/steiger-plugin | FSD 공식 린터. 레이어 간 가져오기 규칙과 공개 API를 검사         |
| 테스트           | Vitest, Testing Library, jsdom          | Vite 설정을 그대로 쓰는 테스트 도구                              |

DOCX·PPTX·XLSX 원문 뷰어, 폼 라이브러리, 컴포넌트 라이브러리는 화면이 정해진 뒤 결정합니다.
