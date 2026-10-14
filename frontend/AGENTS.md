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

5. **Definition of Done (DoD)**:
   ```bash
   npm run lint
   npm run build
   ```

