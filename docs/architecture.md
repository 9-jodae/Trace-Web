# 구조

웹 클라이언트는 Spring 서버의 `/api`만 호출합니다. AI 서버(검색·답변)는 직접 호출하지 않고 서버를 거칩니다. 로컬에서는 Vite 개발 서버가 `/api`를 `http://localhost:8080`으로 프록시합니다.

## Feature-Sliced Design

폴더는 [Feature-Sliced Design](https://feature-sliced.design/kr/)을 따릅니다. 위 레이어는 아래 레이어만 가져올 수 있고, 같은 레이어의 다른 슬라이스는 가져올 수 없습니다.

| 레이어     | 역할                                    | 현재 슬라이스                      |
| ---------- | --------------------------------------- | ---------------------------------- |
| `app`      | 진입점, 라우터, 전역 스타일             | 슬라이스 없음 (`routes`, `styles`) |
| `pages`    | 라우트 하나당 화면 하나                 | `workspace`                        |
| `widgets`  | 독립적인 큰 화면 블록                   | `editor-area`, `chat-panel`        |
| `features` | 사용자 동작 단위 기능                   | `document-tabs`                    |
| `entities` | 문서, 청크, 사용자 같은 업무 개념과 API | 아직 없음                          |
| `shared`   | 업무 지식 없는 공통 코드                | 슬라이스 없음 (`api`, `config`)    |

```
src/
  app/
    routes/router.tsx   라우트 정의
    styles/index.css    Tailwind와 전역 스타일
    App.tsx             QueryClient·Router 연결
  pages/workspace/      메인 화면
  widgets/
    editor-area/        그래프·문서 탭 영역
    chat-panel/         채팅 패널
  features/
    document-tabs/      탭 열기·전환·닫기 (model: 탭 스토어, ui: 탭 바)
  entities/             서버 API 계약이 정해지면 document, chunk 등을 추가
  shared/
    api/                HTTP 클라이언트, 응답 봉투, 토큰, queryClient
    config/             환경 변수
```

슬라이스 안은 목적별 세그먼트(`ui`, `model`, `api`, `lib`, `config`)로 나누고, 바깥에는 `index.ts`로 공개할 것만 내보냅니다. `npm run lint`가 Steiger로 이 규칙을 검사합니다.

## 앞으로 추가할 슬라이스 (예상)

기획서 기준 예상이며, API가 확정되면 추가합니다.

- `entities`: `document`(문서·버전), `chunk`(근거 위치), `answer`(답변과 인용), `user`
- `features`: `ask-question`(질문 보내기), `open-citation`(인용 클릭 시 문서 탭 열기와 하이라이트), `filter-documents`(검색 필터)
- `widgets`: `document-graph`(Sigma.js 그래프), `document-viewer`(원문 뷰어)

## 메인 화면

- 왼쪽 탭 영역은 고정된 그래프 탭과, 연 순서대로 쌓이는 문서 탭으로 구성합니다. 같은 문서를 다시 열면 기존 탭으로 이동합니다.
- 오른쪽은 채팅 패널입니다. 두 영역의 너비는 드래그로 조절합니다.
- 현재는 탭 동작과 레이아웃만 구현했고, 그래프·원문 뷰어·채팅은 자리만 잡아 두었습니다.

## 결정 필요

- **토큰 갱신**: 토큰은 세션 스토리지에 보관해 새로고침해도 로그인이 유지되고, 탭을 닫으면 지워집니다(2026-11-05 결정). 서버 토큰은 1시간 후 만료되고 갱신 토큰이 없어 만료되면 다시 로그인해야 합니다. 갱신 토큰은 서버 정책이 정해지면 반영합니다.
- **최대 문서 탭 수**: 임시로 10개입니다. 넘치면 가장 오래 안 본 탭을 닫습니다.
- **미리보기 탭 방식**, **새 질문 시 열린 문서 탭 처리**: 기획서에서 미결정입니다.
- **배포 방식**: 정적 파일을 서버 레포의 nginx에서 제공할지, 별도로 배포할지 미정입니다.
