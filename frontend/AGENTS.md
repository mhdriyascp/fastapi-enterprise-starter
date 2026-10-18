<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend AI Team Coding Standards & Next.js Guidelines

> **MANDATORY FOR ALL AI AGENTS & ASSISTANTS**  
> Before generating, modifying, or refactoring ANY code in this frontend directory, you **MUST** comply with the instructions in root [`../AGENTS.md`](../AGENTS.md).

## Core Architecture Rules
1. **Layered Structure (`frontend/src/`)**:
   - `lib/types.ts`: TypeScript contracts mirroring backend Pydantic schemas.
   - `lib/api-client.ts`: Centralized fetch wrapper with automatic JWT Bearer injection and 401 silent refresh interceptor.
   - `lib/auth-context.tsx`: Authentication state machine (`user`, `login`, `logout`, session initialization).
   - `components/ui/`: Reusable, atomic UI primitives (`Button`, `Card`, `Badge`, `StatCard`).
   - `components/navigation/`: App shell components (`Sidebar`, `Header`).
   - `hooks/`: Domain and data hooks (`useMenus`, `useAuth`).
   - `app/`: Next.js 15 App Router pages and route groups (`(auth)`, `(dashboard)`).

2. **Dynamic Navigation (Zero Hardcoded Links)**:
   - Navigation items must always be loaded dynamically from `GET /api/v1/menus/my-menus` using `useMenus()`. Never hardcode static route lists for authenticated navigation.

3. **Type Safety & Linting**:
   - Strict TypeScript without `any` types.
   - Every exported component and hook must declare complete prop interfaces and JSDoc summaries.
   - Code must pass `npm run lint` and `npm run build` with **0 errors and 0 warnings**.

4. **Design System Consistency**:
   - Rely on CSS variables and design tokens defined in `globals.css` (dark slate theme, glassmorphism, micro-animations). Avoid arbitrary ad-hoc inline styling.

5. **Standardized Date/Time Presentation (`Oct 14, 2026, 04:41:58 PM`)**:
   - Every date or timestamp rendered in tables, detail modals, cards, badges, or activity logs across all modules MUST format strictly as **`MMM D, YYYY, hh:mm:ss A`** (e.g., **`Oct 14, 2026, 04:41:58 PM`**).
   - All components MUST use `<FormattedDate value={...} />` from `@/components/ui/formatted-date` or functions from `@/lib/date-utils`. Direct calls to `toLocaleDateString()` or `toLocaleString()` are strictly prohibited.
   - Seconds are enabled by default (`includeSeconds: true`). Tooltips show UTC audit timestamps.

6. **Unified Lifecycle UI & RBAC Protocol (Soft-Delete, Purge, & Restore)**:
   - Data-driven module dashboards must provide the 4-segment status tab triad: `All (N)`, `Active (N)`, `Inactive (N)`, and `Deleted (N)`.
   - **Purge Terminology Standard**: Use "Purge" consistently across all user-facing labels, action buttons (`.btn-danger`), confirmation modals, and toast messages. Never label user-facing controls as raw "hard delete".
   - **Context-Aware Action Swapping**: When in `Deleted` tab, action buttons dynamically swap to `Restore (N)` (emerald `.btn-restore`) and `Purge (N)` (red `.btn-danger`).
   - Single and bulk operations must trigger descriptive confirmation modals and provide immediate toast notifications.

7. **Definition of Done (DoD)**:
   ```bash
   npm run lint
   npm run build
   ```

