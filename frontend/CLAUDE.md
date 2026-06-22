# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**Always commit to the `dev` branch.** Never commit directly to `production` or `main` without explicit human approval.

The branch structure is:
- `dev` — active development, where all agent commits go
- `production` — stable, live branch; only receives changes after the human explicitly approves and requests the merge/commit
- `main` — mirrors `dev`

When completing a task, commit the changes to `dev`. Only merge or push to `production` if the user explicitly says so after reviewing the result.

Commit message convention:
```
feat: add contact form
fix: handle lambda timeout
refactor: extract visitor service
docs: update architecture notes
chore: bump dependencies
```

## Coding Standards

**Frontend:** functional components and hooks only — no class components, no `any` type.

**Backend (Lambda):** Clean Architecture principles, single responsibility per function, dependency injection where appropriate.

## Project Overview

This is a **cloud-native portfolio platform** built on AWS. The frontend is a React SPA; the backend is fully serverless.

### AWS architecture (planned/in-progress)

| Layer | Tech |
|---|---|
| Hosting | S3 + CloudFront |
| API | API Gateway + Lambda (Node.js) |
| Database | DynamoDB |
| IaC | Terraform |
| Secrets | SSM Parameter Store (SecureString for sensitive values) |
| Email | SES (contact form) |

Frontend connects to the backend via `VITE_API_BASE_URL` (API Gateway URL). When unset locally, all API calls fall back safely so the UI works without infra.

### Planned backend features

**Visitor Counter** — `POST /visitors` increments a DynamoDB atomic counter per country (country extracted from `CloudFront-Viewer-Country` header, injected by CloudFront automatically). `GET /visitors` returns total + breakdown.

**Infrastructure Status** — `GET /status` reads `/portfolio/version` and `/portfolio/last-deploy` from SSM (updated by GitHub Actions on each deploy) and returns API health + frontend health. Expected response shape: `{ api: 'online'|'offline'|'degraded', frontend: 'online'|'offline'|'degraded', lastDeploy: string (ISO 8601), version: string }`. Frontend component `InfraStatusPanel` (`src/components/InfraStatusPanel.tsx`) and hook `useInfraStatus` (`src/hooks/useInfraStatus.ts`) are already implemented — polls every 60s, shows placeholder dashes when backend is unavailable. The panel sits below `GitHubPanel` in the Hero right column.

**GitHub Activity (server-side cache)** — EventBridge cron (1h) runs `syncGithubActivity` Lambda, which fetches from the GitHub API using a PAT stored in `/portfolio/github-token` (SSM SecureString) and writes results to a DynamoDB `github_cache` table with TTL. `GET /github/activity` serves the cached data. Currently, the frontend fetches the GitHub API directly with a client-side localStorage cache as a temporary workaround.

**Admin CMS** — `/admin` route (already scaffolded in the frontend) will become a full CMS: edit projects, experience, certifications stored in DynamoDB `portfolio_content` table (PK: `type`, SK: `lang`), upload resume PDFs directly to S3 via presigned URLs, view contact form submissions and visitor analytics. Auth: JWT issued by `POST /admin/login` Lambda, validated against a password in `/portfolio/admin-password` SSM. JWT secret in `/portfolio/admin-jwt-secret`.

### Suggested implementation order

1. Migrate i18n content (`en.ts`/`pt.ts` arrays) → DynamoDB `portfolio_content` table (frontend reads via API on load)
2. Resume upload (S3 presigned URL + CloudFront invalidation on upload)
3. Admin auth (JWT via SSM) + `/admin` route integration
4. Content editing forms in admin panel
5. Visitor counter (Lambda + DynamoDB atomic counter)
6. Infrastructure status panel
7. Server-side GitHub activity cache (replace the current client-side fetch)

## Commands

```bash
npm run dev       # start dev server (Vite, http://localhost:5173)
npm run build     # TypeScript check + Vite production build → dist/
npm run lint      # ESLint
npm run preview   # serve the dist/ build locally
```

There are no tests — Playwright is installed as a devDependency but no test files exist yet.

## Architecture

### Routing & entry point

`main.tsx` → `App.tsx` sets up `BrowserRouter` + `LangProvider`, then routes:
- `/` → `Portfolio` (the public-facing page)
- `/admin/*` → `AdminPage` (protected dashboard)

`Portfolio.tsx` is a simple shell that composes the page sections in order: `Navbar → Hero → About → ExperienceSection → ProjectsSection → CertificationsSection → ContactSection → Footer`.

### Internationalisation (i18n)

All user-visible text lives in `src/i18n/en.ts` and `src/i18n/pt.ts`. The `Translations` interface in `src/i18n/types.ts` is the single source of truth for what both files must export. Components consume translations exclusively via `useLang()` from `src/i18n/index.tsx`, which provides a `{ lang, t, setLang }` context. The selected language is persisted to `localStorage`.

**Content that is translated includes the data arrays** (`projects.items`, `showcaseItems`, `experience.items`, `certifications.items`) — these are part of the translation objects, not separate data files. `src/data/projects.ts`, `src/data/experience.ts`, and `src/data/certifications.ts` exist as standalone fallbacks/references but the live content comes from `en.ts` / `pt.ts`.

### Theming

Dark mode uses a CSS class strategy (`dark` on `<html>`). Tailwind v4 is configured in `src/index.css` with `@custom-variant dark`. The accent color scale (`accent-*`) is defined there and maps to a cyan/AWS palette — change it in one place to re-theme the whole site. `useTheme` (in `src/hooks/useTheme.ts`) syncs React state with the DOM class and `localStorage`.

### Section layout pattern

Every content section uses `<Section id="..." eyebrow="..." title="...">` from `src/components/ui/Section.tsx`, which wraps content in a `<Container>` and applies a Framer Motion scroll-reveal animation (`whileInView`, `once: true`). Nav anchor links (`#projects`, `#about`, etc.) rely on matching `id` props in Section.

### Expandable panels

Both `GitHubPanel` and `VideoProjectCard` use the same expand/collapse pattern:
1. Always-visible content on top
2. `AnimatePresence` + `motion.div` with `height: 0 → auto` for the expandable section
3. The expand/collapse `<button>` sits **after** the `AnimatePresence` block so it always renders at the bottom of the card

### Backend / API

`src/services/api.ts` is a thin fetch wrapper pointing at `VITE_API_BASE_URL`. When the env var is unset (local dev without backend), all calls return safe fallbacks so the UI works without infrastructure. Backend endpoints planned:
- `POST /contact` — sends email via SES
- `POST /visitors` — increments DynamoDB counter and returns the count

### GitHub activity

`useGithubActivity` in `src/hooks/useGithubActivity.ts` fetches from the public GitHub API directly from the browser. Results are cached in `localStorage` for 1 hour (key: `github_activity_cache`) to avoid rate-limiting. `SKIP_REPOS` filters out forked/unwanted repos.

### Admin panel

`/admin` is a client-side-only panel with a hardcoded password check (`"admin"`) — a placeholder until the real JWT flow (`POST /admin/login` via API Gateway + SSM) is wired up. Auth state is stored in `sessionStorage` as `admin_token`.

### Scroll spy

`useScrollSpy` (`src/hooks/useScrollSpy.ts`) returns `[activeId, notifyNavClick]`. It listens to the `scroll` event and compares each section's `absoluteTop` (= `getBoundingClientRect().top + scrollY`) against `scrollY + offset` (currently `250`). When the user is at the bottom of the page, the last section is always forced active. **Do not use IntersectionObserver** — it breaks for long sections and ratio-based sorting is unreliable.

`notifyNavClick(id)` must be called from every nav `<a onClick>` to immediately set the active item and suppress the spy for 1 200 ms (via `suppressUntil` ref) so smooth-scroll animation doesn't race against the highlight.

Section components must **not** have `scroll-mt-*` — `scroll-padding-top: 4rem` on `html` already handles the navbar offset. Double-applying both shifts sections too far down.

### View Transitions

Theme and language toggles use the View Transitions API (`document.startViewTransition`). Before calling it, set `data-vt="theme"` or `data-vt="lang"` on `<html>` — CSS in `src/index.css` uses this attribute to select the right animation:

- **Theme** (`data-vt="theme"`): circular reveal from the button origin. CSS vars `--vt-x` / `--vt-y` are set before the transition.
- **Lang** (`data-vt="lang"`): old snapshot stays (`animation: none; z-index: 0`), new fades in on top (`z-index: 1`). This avoids a black flash that would appear if the old content faded out before the new content faded in.

Always use `flushSync(() => setState(...))` inside the transition callback so React commits synchronously before the browser captures the new snapshot.

### Background effects

`BackgroundEffects.tsx` renders a fixed full-screen layer (`z-index: -10`) with four children (in order):

1. **Dot grid** — `<div className="dot-grid">`: radial-gradient dots (28 px grid), masked with `linear-gradient(to right, black, transparent 18%, transparent 82%, black)` so dots appear only on the left/right sides and are hidden across the full-height center column.
2. **Orb 1** — top-right, cyan, `animate-orb-1` (28 s drift).
3. **Orb 2** — bottom-left, violet, `animate-orb-2` (34 s drift).
4. **Orb 3** — centered, very subtle cyan, `animate-orb-3` (22 s drift).
5. **Mouse glow** — fixed overlay reading `--mouse-x` / `--mouse-y` CSS vars (updated via `mousemove` listener in `useEffect`).

**Critical:** the background color must be set on `body`, not `html`. Setting it on `html` creates a stacking context that hides fixed elements with negative `z-index` (the orbs and dot grid disappear). The FOUC-prevention inline `<style>` in `index.html` already targets `body`.

### FOUC prevention

`index.html` has an inline `<script>` before `</head>` that reads `localStorage('theme')` and adds `class="dark"` to `<html>` before first paint. An inline `<style>` sets `body { background: #ffffff }` / `html.dark body { background: #09090b }` so the background is correct even before the CSS bundle loads.
