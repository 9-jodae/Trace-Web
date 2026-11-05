# 로컬 실행

Node.js 22.12 이상이 필요합니다. CI는 Node.js 24를 사용합니다.

저장소를 복제한 뒤 `git config core.hooksPath .githooks`를 실행해 pre-push 훅을 활성화합니다. 훅은 원격 브랜치 삭제와 non-fast-forward push를 거부합니다. 이미 push한 브랜치는 rebase하지 말고 `git merge`로 갱신합니다.

1. 서버 레포에서 `docker compose up -d`와 `./gradlew bootRun`으로 서버를 실행합니다.
2. 이 레포에서 `npm ci`로 의존성을 설치합니다.
3. `npm run dev`로 개발 서버를 실행하고 `http://localhost:3000`을 엽니다.

서버의 기본 CORS 허용 주소가 `http://localhost:3000`이므로 개발 서버 포트는 3000으로 고정했습니다. 서버 주소가 다르면 [.env.example](../.env.example)을 참고해 `.env.local`에 `VITE_API_PROXY_TARGET`을 지정합니다. 배포 환경에서 API 주소가 다르면 `VITE_API_BASE_URL`을 지정합니다.
