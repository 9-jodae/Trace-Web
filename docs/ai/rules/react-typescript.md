# React and TypeScript

- Use function components and hooks. Keep components small; move logic that needs tests into plain functions or stores.
- Import with the `@/` alias across slices and layers, and with relative paths inside a slice (see `rules/fsd.md`).
- Type every API request and response to match the server DTO. Do not use `any`; narrow `unknown` instead.
- Server state lives in TanStack Query (query keys start with the entity name). Client UI state lives in a Zustand store in the `model` segment of the owning slice. Do not copy server data into stores.
- Style with Tailwind utility classes. Use `clsx` for conditional classes. Use `lucide-react` for icons.
- Render document graphs with Sigma.js and graphology (WebGL), PDFs with `react-pdf`, and Markdown with `react-markdown` and `remark-gfm`. Discuss before adding another library in the same role.
