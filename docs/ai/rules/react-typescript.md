# React and TypeScript

- Use function components and hooks. Keep components small; move logic that needs tests into plain functions or stores.
- Import with the `@/` alias for anything outside the current folder.
- Type every API request and response to match the server DTO. Do not use `any`; narrow `unknown` instead.
- Server state lives in TanStack Query (query keys start with the domain name). Client UI state lives in a Zustand store in the owning domain. Do not copy server data into stores.
- Style with Tailwind utility classes. Use `clsx` for conditional classes. Use `lucide-react` for icons.
- Render document graphs with Sigma.js and graphology (WebGL), PDFs with `react-pdf`, and Markdown with `react-markdown` and `remark-gfm`. Discuss before adding another library in the same role.
