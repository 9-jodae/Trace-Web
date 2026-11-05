# Security

- Never read, commit, or log secrets, tokens, document contents, presigned URLs, or `.env` files. Configure the client only through `VITE_` variables documented in `.env.example`; anything with that prefix ships to the browser, so never put secrets there.
- The server enforces authorization. The client may hide controls for usability but must not decide access to documents.
- Keep the access token only in `sessionStorage` through `useTokenStore` in `@/shared/api` (team decision, 2026-11-05). Never use `localStorage` or cookies for it, and clear it on a 401 response. Do not put tokens or document text in URLs or query strings.
- Render document text as text. Do not use `dangerouslySetInnerHTML` on server or document content.
