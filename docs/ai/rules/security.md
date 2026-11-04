# Security

- Never read, commit, or log secrets, tokens, document contents, presigned URLs, or `.env` files. Configure the client only through `VITE_` variables documented in `.env.example`; anything with that prefix ships to the browser, so never put secrets there.
- The server enforces authorization. The client may hide controls for usability but must not decide access to documents.
- Keep the access token in memory unless a confirmed server policy says otherwise. Do not put tokens or document text in URLs or query strings.
- Render document text as text. Do not use `dangerouslySetInnerHTML` on server or document content.
