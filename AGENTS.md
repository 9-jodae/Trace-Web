# Repository instructions

This is the single source of repository rules. Keep AI harness files (`AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.claude/**`, `.codex/**`, `docs/ai/**`) in English. Keep human documentation (`README.md`, other `docs/**`, issue and PR templates), user-facing messages, commit subjects, PR bodies, and reports in Korean. Put workflow details in `docs/ai/` and background in the Korean `docs/` files.

## Structure and ownership

- Follow Feature-Sliced Design (FSD). Layers from top to bottom: `app`, `pages`, `widgets`, `features`, `entities`, `shared`. A module imports only from layers below it, and never from another slice on the same layer. Follow `docs/ai/rules/fsd.md` and `docs/ai/rules/react-typescript.md`.
- Import a slice only through its `index.ts` public API. Inside a slice, use relative imports. `npm run lint` runs Steiger to enforce these rules.
- Call the server only through `@/shared/api`. Keep server state in TanStack Query and client UI state in Zustand stores in the `model` segment of the owning slice.
- Add a feature in this order: entity types and API, feature model and UI, widget composition, page and route, tests. Follow `docs/ai/workflows/add-feature.md`.
- The server (`9-jodae/docs199-Server`) owns API contracts and access rules. Match its `docs/` and response envelope; never re-implement authorization decisions in the client.

## Safety and verification

- Do not invent unconfirmed screens, APIs, or access rules. Record unresolved decisions in the relevant Korean `docs/` file.
- Never commit or log secrets, tokens, document contents, or presigned URLs. Follow `docs/ai/rules/security.md`.
- Update README and relevant `docs/` when behavior or setup changes. Run `npm run verify` and report actual results. Follow `docs/ai/workflows/verify.md`.

## Branches, commits, and PRs

- Before work, inspect the current directory, `git status`, branch, and `git fetch` result. Preserve existing changes and stop on conflicts that need judgment.
- Never push directly to `main` or `develop`. Use a feature branch, focused commits, and a PR targeting `develop`. State dependencies on preceding PRs.
- Never force push or rewrite published history: no `--force`, `--force-with-lease`, `-f`, `+refspec` pushes, and no rebase of pushed branches. Update stacked branches with `git merge`. If a push is rejected as non-fast-forward, fetch and merge; stop if that needs judgment.
- Use `type(scope): Korean description`; allowed types are `feat`, `fix`, `docs`, `test`, `chore`, `refactor`. Write PR reasons, changes, verification, and related issues in Korean. Follow `docs/ai/workflows/commit-and-pr.md`.
- A PR is not done until review-bot comments are handled per `docs/ai/workflows/review-response.md`.
