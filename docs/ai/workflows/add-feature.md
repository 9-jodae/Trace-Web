# Add a feature

1. Confirm the screen in the product spec and the API in the server's `docs/`. If either is unconfirmed, stop and record the open decision in the relevant Korean `docs/` file.
2. Create `src/domain/<feature>/`. Add request and response types matching the server DTOs, then API functions that call `request()` from `src/global/api/client.ts`.
3. Add TanStack Query hooks for server state. Add a Zustand store only for client UI state the feature owns.
4. Add components and, if needed, a route in `src/app/router.tsx`. Keep user-facing text in Korean.
5. Add tests per `docs/ai/rules/testing.md`, update `README.md` or `docs/` if setup or behavior changed, and run `docs/ai/workflows/verify.md`.
