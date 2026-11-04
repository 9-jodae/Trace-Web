# Feature-Sliced Design

| Layer      | Holds                                                                                | Slices |
| ---------- | ------------------------------------------------------------------------------------ | ------ |
| `app`      | Entry, provider wiring, routes, global styles                                        | No     |
| `pages`    | One slice per route, composes widgets                                                | Yes    |
| `widgets`  | Large self-contained UI blocks (editor area, chat panel, graph panel)                | Yes    |
| `features` | User actions with business value (open document tab, ask question, filter documents) | Yes    |
| `entities` | Business entities and their API and types (document, chunk, user, answer)            | Yes    |
| `shared`   | Reusable code with no business logic (API client, config, UI kit, lib)               | No     |

- Imports go strictly downward: `app → pages → widgets → features → entities → shared`. No imports from a higher layer or a sibling slice on the same layer. If two features need each other, move the shared part down to an entity or compose them in a widget.
- Slice names are kebab-case nouns or actions (`document-tabs`, `ask-question`). Segments are named by purpose: `ui`, `model`, `api`, `lib`, `config`. Never use `components`, `hooks`, `utils`, `helpers`, or `providers`.
- Every slice exposes a public API in `index.ts`. Outside the slice, import only from that file (`@/features/document-tabs`). Inside the slice, use relative imports.
- `shared` and `app` have segments but no slices. `@/shared/api` owns the HTTP client, response envelope, token, and `queryClient`.
- Run `npm run lint`; Steiger reports structure violations. `fsd/insignificant-slice` is off until more pages exist.
