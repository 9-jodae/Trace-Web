# Testing

- Test decision logic (stores, mappers, API envelope handling) with Vitest unit tests next to the source as `*.test.ts(x)`.
- Test component behavior with Testing Library through roles and visible Korean text, not implementation details.
- Reset store state between tests. Do not call the real server in tests.
- Run the command in `docs/ai/workflows/verify.md`; report real results in Korean.
