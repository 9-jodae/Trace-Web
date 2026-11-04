# docs199 웹

사내 문서 검색 서비스의 React 웹 클라이언트입니다. 메인 화면은 왼쪽의 그래프·문서 탭 영역과 오른쪽의 채팅 패널로 구성합니다. 서버는 [docs199-Server](https://github.com/9-jodae/docs199-Server)입니다.

## 로컬 실행

Node.js 22.12 이상(권장 24)을 설치한 뒤 실행합니다.

```bash
git config core.hooksPath .githooks
npm ci
npm run dev
```

`http://localhost:3000`을 엽니다. `/api` 요청은 Vite 프록시가 `http://localhost:8080`의 서버로 전달합니다. 서버 실행 방법과 데모 계정은 서버 레포의 로컬 실행 안내를 참고하세요. 자세한 내용은 [로컬 실행 안내](docs/local-setup.md)에 있습니다.

## 개발

[개발 규약](docs/conventions.md), [구조](docs/architecture.md), [라이브러리 선택](docs/libraries.md)을 확인하세요. PR 전에는 `npm run verify`를 실행합니다.

| 명령             | 내용                               |
| ---------------- | ---------------------------------- |
| `npm run dev`    | 개발 서버 (포트 3000)              |
| `npm run build`  | 타입 검사 후 프로덕션 빌드         |
| `npm run lint`   | oxlint 검사                        |
| `npm run format` | Prettier 정렬                      |
| `npm test`       | Vitest 테스트                      |
| `npm run verify` | 린트, 포맷 검사, 테스트, 빌드 전체 |
