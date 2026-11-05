# 배포 (Vercel)

웹 클라이언트는 Vercel에 정적 사이트(Vite 빌드 결과 `dist`)로 배포합니다. 설정은 루트의 `vercel.json`에 있습니다.

## 처음 연결하기

1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인합니다.
2. **Add New… → Project**에서 `9-jodae/docs199-Web` 저장소를 Import합니다. 조직 저장소가 보이지 않으면 GitHub App 권한에서 `9-jodae` 조직 접근을 허용합니다.
3. Framework Preset은 Vite, Build Command는 `npm run build`, Output Directory는 `dist`입니다(`vercel.json`에 지정되어 있어 그대로 두면 됩니다).
4. 환경변수 `VITE_API_BASE_URL`은 **설정하지 않습니다**. 비워 두면 같은 출처의 `/api`로 요청하고, Vercel이 아래 rewrite로 서버에 전달합니다.
5. **Deploy**를 누릅니다. 이후에는 push하면 자동 배포됩니다(Production Branch 브랜치는 운영 주소, 그 외 브랜치·PR은 미리보기 주소).

## `vercel.json` rewrite

| 경로       | 전달 대상                      | 이유                                                                                        |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `/api/*`   | `http://3.0.74.114:8080/api/*` | 개발 서버의 Vite 프록시와 같은 역할. 같은 출처라 CORS 설정과 mixed content가 필요 없습니다. |
| 그 외 전체 | `/index.html`                  | React Router 경로에서 새로고침해도 404가 나지 않게 합니다.                                  |

서버 주소가 바뀌면 `vercel.json`의 `/api` 대상만 수정합니다.

## 미결 사항

- 서버가 고정 IP의 HTTP로 열려 있습니다. 도메인과 HTTPS가 정해지면 rewrite 대상을 바꿉니다.
- Vercel 프로젝트를 누구 계정(개인 또는 팀)에 만들지, Production Branch를 `main`과 `develop` 중 무엇으로 할지는 정해지지 않았습니다.
