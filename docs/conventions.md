# 개발 규약

- 폴더는 `src/app`(라우터·전역 Provider), `src/global`(API 클라이언트, 인증, 공통 스타일), `src/domain/<기능>`(기능 코드)을 사용합니다. 서버의 `global`/`domain` 구분과 맞춥니다.
- 폴더 밖 모듈은 `@/` 별칭으로 가져옵니다. 예: `import { request } from '@/global/api/client'`
- 서버 호출은 `src/global/api/client.ts`의 `request()`만 사용합니다. 서버의 `{ success, data, error }` 응답에서 `data`를 꺼내고, 실패는 `ApiRequestError`(`status`, `code`, `message`)로 던집니다. 목록은 서버와 같은 0부터 시작하는 `PageResponse`를 씁니다.
- 서버 상태는 TanStack Query, 화면 상태(탭, 하이라이트 등)는 기능 폴더의 Zustand 스토어에 둡니다. 서버 데이터를 스토어에 복사하지 않습니다.
- 스타일은 Tailwind 유틸리티 클래스로 작성하고, 조건부 클래스는 `clsx`를 씁니다.
- 사용자에게 보이는 문구는 한국어로 씁니다.
- 권한 판단은 서버가 합니다. 클라이언트는 편의상 버튼을 숨길 수 있지만 문서 접근을 결정하지 않습니다.
- 토큰, 문서 본문, 비공개 파일 URL은 로그나 URL에 남기지 않습니다. `VITE_`로 시작하는 환경 변수는 브라우저에 그대로 노출되므로 비밀값을 넣지 않습니다.
- 결정 로직(스토어, 응답 처리)은 소스 옆 `*.test.ts`로 단위 테스트합니다.
- 커밋은 `type(scope): 설명` 형식이고, `main`·`develop`에 직접 푸시하지 않고 `develop` 대상 PR을 엽니다.
