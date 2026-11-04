# docs199-Web

사내 문서를 근거로 답변하는 RAG 기반 문서 검색 서비스의 프론트엔드입니다. 자연어 질문에 대해 사내 문서(매뉴얼, 규정, 보고서 등)를 근거로 답변하고, 답변의 각 문장이 어느 문서의 어느 부분에서 나왔는지 원문 하이라이트로 확인할 수 있습니다.

## 주요 기능

- **근거 기반 문서 검색** — 자연어 질문 → 사내 문서 기반 답변, 문장 단위 출처(citation) 표시
- **원문 하이라이트 뷰어** — 근거 클릭 시 원문에서 해당 구절 하이라이트
- **문서 관계 그래프** — 근거 문서와 연관 문서를 그래프로 탐색, 문서 유형/확장자/기간 필터
- **문서 관리** — 업로드/개정/삭제 시 검색 인덱스 자동 반영, 처리 상태(처리 중/완료/실패) 확인
- **권한 기반 접근 제어** — 부서/직급별 문서 열람 범위 제한, 비인가 문서는 검색·답변에서 제외
- **외부 소스 연동** — Notion / Obsidian / 로컬 드라이브 문서를 통합 검색 대상으로 연결

## 기술 스택

- React 18 + TypeScript + Vite
- React Router, TanStack Query, Zustand
- 아키텍처: [Feature-Sliced Design](https://feature-sliced.design/) (steiger로 레이어 규칙 검증)

## 폴더 구조

```
src/
  app/       # 라우팅, 전역 프로바이더, 글로벌 스타일 (진입점)
  pages/     # 라우트 단위 화면 (search, graph, document-viewer, admin-*, ...)
  widgets/   # 여러 feature/entity를 조합한 복합 UI 블록
  features/  # 사용자 행동 단위 (ask-question, upload-document, manage-permission, ...)
  entities/  # 도메인 모델 (document, citation, source, graph, answer, user, alert)
  shared/    # API 클라이언트, 설정, 공용 UI 컴포넌트
```

각 슬라이스는 `index.ts`를 통해서만 외부에 공개됩니다(public API). 슬라이스 내부 파일을 다른 슬라이스에서 직접 import하지 마세요.

## 시작하기

```bash
npm install
cp .env.example .env   # 필요 시 VITE_API_BASE_URL 수정
npm run dev
```

### 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입체크(`tsc -b`) 후 프로덕션 빌드 |
| `npm run lint:fsd` | FSD 레이어 경계 규칙 검사 (steiger) |

## 현재 상태 / 유의사항

- 백엔드 API(`/api`)가 아직 없는 상태에서는 로그인 등 서버 연동 화면은 확인이 어렵습니다. 로컬에서 UI를 확인하려면 목업 API(MSW 등)가 필요합니다.
- 아직 ESLint/Prettier, 테스트 러너(Vitest) 설정이 없습니다.
- `chore/initial-setup` 브랜치에 별도로 구성된 스캐폴드가 있습니다. 두 스캐폴드 중 어느 쪽을 기준으로 할지는 팀 논의 후 정리될 예정입니다.
