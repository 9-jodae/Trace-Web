# Add a feature

1. Confirm the screen in the product spec and the API in the server's `docs/`. If either is unconfirmed, stop and record the open decision in the relevant Korean `docs/` file.
2. Decide the layer for each piece using `docs/ai/rules/fsd.md`. Reuse an existing slice before creating a new one.
3. Put server data types and API calls in `entities/<entity>/api` and `model`, calling `request()` from `@/shared/api`. Add TanStack Query hooks there.
4. Put a user action (open a document, send a question, apply a filter) in `features/<feature>` with its `model` and `ui`. Compose features and entities into blocks in `widgets/<widget>`, and widgets into `pages/<page>`. Register routes in `src/app/routes/router.tsx`.
5. Export each slice's public API from its `index.ts`. Keep user-facing text in Korean.
6. Add tests per `docs/ai/rules/testing.md`, update `README.md` or `docs/` if setup or behavior changed, and run `docs/ai/workflows/verify.md`.
