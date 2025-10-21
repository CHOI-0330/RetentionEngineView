# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Next.js App Router entry points (`page.tsx`, route handlers, `globals.css`) used to showcase each view.
- `src/views/` holds stateless view compositions; pair them with primitives from `src/components/ui/`.
- `src/interfaceAdapters/` and `src/application/` mirror the Clean Architecture layers (controllers, gateways, entitle-specific interactors). Keep new integration code here rather than in views.
- `src/lib/` centralizes shared utilities like Supabase clients; `supabase/schema.sql` tracks required SQL.
- `src/mocks/` groups mock gateways (e.g., in-memory LLM) that are safe for sandboxed flows.
- `docs/` stores architecture notes, while `devtools/` now houses legacy sandboxes and scenarios separated from runtime code.

## Build, Test, and Development Commands
- `npm install` ensures dependencies stay aligned with `package-lock.json`.
- `npm run dev` runs Next.js locally at `http://localhost:3000`, exposing `/`, `/student`, and `/mentor` for manual QA.
- `npm run build` performs the production build; pair with `npm run start` when validating deployment artifacts.

## Coding Style & Naming Conventions
- Code is TypeScript-first with React 18. Follow Prettier defaults (2-space indent, double quotes) and keep files lint-clean.
- Components live in `PascalCase` files, hooks in `camelCase` files prefixed with `use`, and shared schema/types in `src/types` or `src/type`.
- Prefer named exports, colocate view-specific styles under `src/styles`, and reuse the `cn` helper for class merging.

## Testing Guidelines
- Automated testing is not yet wired up; manually verify UI states via the dev server before opening a PR.
- When adding tests, discuss the framework in your PR (React Testing Library or Playwright are preferred) and place specs alongside the feature (e.g., `ComponentName.spec.tsx`).
- Keep Supabase- or Gemini-dependent code guarded behind environment checks so local runs succeed without secrets.

## Commit & Pull Request Guidelines
- Follow the existing log pattern of `<Scope>: <imperative summary>` (e.g., `SupabaseAuthGateway: Improve error handling`). Group unrelated fixes into separate commits.
- PRs must include: purpose summary, QA notes (pages visited, scenarios covered), linked issue or task, and screenshots/GIFs for UI changes.
- Flag configuration updates (e.g., new env vars, Supabase migrations) in the PR checklist and reference accompanying docs.

## Configuration & Security Notes
- Create a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ENTITLE_SANDBOX`, `GEMINI_API_KEY`, and `GEMINI_MODEL_ID`. Never commit secrets.
- Use placeholder keys (`TODO_...`) in shared snippets and update `docs/` if configuration requirements change.
