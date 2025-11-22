
  # Retention Engine UI (View-Only, Next.js)

  Pure view components prepared for Clean Architecture. Business/stateful container logic is removed; only UI is kept. The app now runs on Next.js (App Router).

  - Stateless views: `src/views/*`, primitives in `src/components/ui/*`
  - Next pages: `app/` (no domain logic, only static props showcase)
  - Global styles: `app/globals.css` imports `src/index.css` (prebuilt Tailwind styles)

  ## Getting started

  1. Install dependencies: `npm i`
  2. Start dev server: `npm run dev`
  3. Pages:
     - `/` (links)
     - `/student` (StudentChatView showcase)
     - `/mentor` (MentorDashboardView showcase)

  ## Notes
  - Some UI-only local state (e.g., open/close in dialogs/sheets) is kept via `useState` for usability and can be lifted later.
  - Styles come from a precompiled Tailwind CSS file (`src/index.css`), so no Tailwind config is required at runtime.
- The UI directly calls the backend `/llm/generate` endpoint for assistant responses, so no separate `LLM_BACKEND_BASE_URL` proxy is required.
  
