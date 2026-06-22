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

No `Co-Authored-By` trailers in commits.

## Coding Standards

**Frontend:** functional components and hooks only — no class components, no `any` type.

**Backend (Lambda):** Clean Architecture principles, single responsibility per function, dependency injection where appropriate.

## Project Overview

This is a **cloud-native portfolio platform** built on AWS. The frontend is a React SPA; the backend is fully serverless.

### AWS architecture

| Layer | Tech | Status |
|---|---|---|
| Hosting | S3 + CloudFront (OAC) | **live** |
| CI/CD | GitHub Actions | **live** |
| API | API Gateway HTTP API + Lambda (Node.js 20) | **live** |
| IaC | Terraform (`infra/`) | **live** |
| Secrets / config | SSM Parameter Store | **live** |
| Database | DynamoDB | **live** (visitors + contacts tables) |
| Email | SES | **live** (contact form) |

Frontend connects to the backend via `VITE_API_BASE_URL` (API Gateway invoke URL). When unset locally, all API calls return safe fallbacks so the UI works without infra.

### Environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | GitHub secret + local `.env.production` | API Gateway base URL |
| `VITE_GITHUB_TOKEN` | GitHub secret | Fine-grained read-only PAT — raises GitHub API rate limit from 60 to 5000 req/h |

### CI/CD — `.github/workflows/deploy-frontend.yml`

Triggers on push to `production` branch (or `workflow_dispatch`). Steps:
1. `npm ci` + `npm run build` (injects `VITE_*` secrets as env vars)
2. `aws s3 sync dist/ s3://$S3_BUCKET/` — assets with long cache, `index.html` with no-cache
3. `aws cloudfront create-invalidation` — purges CDN cache
4. `aws ssm put-parameter` — writes version, timestamp, commit SHA+message to `/portfolio/*`

GitHub secrets required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_BASE_URL`, `VITE_GITHUB_TOKEN`.

### Terraform — `infra/`

```
infra/
  versions.tf          # provider AWS ~> 5.0
  variables.tf         # aws_region, project_name, environment, contact_email
  main.tf              # S3, CloudFront OAC, SSM params, GitHub Actions IAM user
  lambda.tf            # Lambda exec role + all Lambda functions (zipped via archive_file)
  api_gateway.tf       # HTTP API, $default stage, all routes + Lambda permissions
  dynamodb.tf          # visitors table (PK: pk String) + contacts table (PK: id String)
  ses.tf               # SES email identity + Lambda SES IAM policy
  outputs.tf           # CloudFront URL, API GW URL, S3 bucket, IAM keys
  terraform.tfvars.example
```

Run order: `terraform init` → `terraform plan` → `terraform apply`. After first apply, copy outputs to GitHub secrets.

For Lambda hotfixes without a full CI/CD cycle:
```bash
terraform apply -target=aws_lambda_function.contact
```

SSM parameters managed by Terraform (initial values), overwritten by CI on every deploy:
- `/portfolio/version` — full git SHA
- `/portfolio/last-deploy` — ISO 8601 timestamp
- `/portfolio/last-commit-sha` — 7-char short SHA
- `/portfolio/last-commit-message` — commit subject line

### DynamoDB tables

Both tables use `PAY_PER_REQUEST` billing.

**`cloud-portfolio-visitors-prod`** — visitor counter
- PK: `pk` (String) — `"TOTAL"` for global count, `"COUNTRY#BR"` etc. for per-country counts
- Attribute: `count` (Number) — atomically incremented with `ADD`

**`cloud-portfolio-contacts-prod`** — contact form submissions
- PK: `id` (String) — `"${Date.now()}-${randomSuffix}"` (sortable by newest first)
- Attributes: `name`, `email`, `message`, `referrer`, `device`, `timezone`, `locale`, `timeOnSite` (Number, seconds), `country`, `ip`, `receivedAt` (ISO 8601)

### Backend — `backend/functions/`

```
backend/
  functions/
    status/
      index.mjs   # GET /status — reads 4 SSM params, returns { api, frontend, version, lastDeploy, lastCommit }
    visitors/
      index.mjs   # GET /visitors — returns { count } from TOTAL item
                  # POST /visitors — atomically increments TOTAL + COUNTRY#xx, returns { count }
    contact/
      index.mjs   # POST /contact — validates body, sends HTML+text SES email, saves to DynamoDB contacts table
    contacts/
      index.mjs   # GET /contacts — scans contacts table, returns { items } sorted by id desc (newest first)
```

Lambda runtime: `nodejs20.x`. All AWS SDK v3 clients (`@aws-sdk/client-ses`, `@aws-sdk/client-dynamodb`, `@aws-sdk/util-dynamodb`, `@aws-sdk/client-ssm`) are available in the runtime without bundling. CORS headers included inline in every Lambda (`Access-Control-Allow-Origin: *`).

### Live API endpoints

| Method | Path | Lambda | Description |
|---|---|---|---|
| GET | `/status` | status | SSM params → health + lastDeploy + lastCommit |
| GET | `/visitors` | visitors | returns `{ count }` |
| POST | `/visitors` | visitors | increments counter (country from CloudFront header), returns `{ count }` |
| POST | `/contact` | contact | sends SES email + saves to contacts DynamoDB table |
| GET | `/contacts` | contacts_get | lists all contact submissions, newest first |

### Contact Lambda details

`backend/functions/contact/index.mjs`:
- Validates `name`, `email`, `message` (400 if missing)
- Reads visitor metadata: `cloudfront-viewer-country` header, `requestContext.http.sourceIp`, `user-agent` (parsed to `"Desktop · macOS · Chrome"` format)
- Receives from frontend: `timeOnSite` (seconds on site), `timezone` (IANA), `locale` (navigator.language), `referrer` (document.referrer or `"direct"`)
- Sends branded HTML email from `Alessandro Bezerra da Silva <CONTACT_EMAIL>`, Reply-To set to sender
- Subject: `[Portfolio] ${name} — ${message.slice(0, 55)}…`
- After email: writes full record to DynamoDB contacts table; DynamoDB failure is caught and logged so the email always delivers
- Env vars: `CONTACT_EMAIL`, `CONTACTS_TABLE`

### Lambda IAM permissions

Single `lambda_exec` role shared by all functions:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `ssm:GetParameters` on `arn:aws:ssm:*:*:parameter/portfolio/*`
- `dynamodb:GetItem`, `dynamodb:UpdateItem` on visitors table
- `dynamodb:PutItem`, `dynamodb:Scan` on contacts table
- `ses:SendEmail` on the SES email identity + `configuration-set/*`

### Planned / next

**Admin dashboard improvements** — The `/admin` panel currently shows real visitor count and real contact messages. Next: replace hardcoded password with JWT auth (`POST /admin/login` Lambda reading `/portfolio/admin-password` from SSM), add visitor country breakdown endpoint, add content management (projects, experience, certifications from DynamoDB).

**Server-side GitHub activity cache** — EventBridge cron (1h) Lambda fetches from GitHub API using PAT in SSM SecureString, writes to DynamoDB `github_cache` table with TTL. `GET /github/activity` serves it. Currently the frontend fetches GitHub directly with `VITE_GITHUB_TOKEN`.

**Content CMS** — projects, experience, certifications migrate from `en.ts`/`pt.ts` to DynamoDB `portfolio_content` table (PK: `type`, SK: `lang`), editable from admin panel.

**Resume upload** — S3 presigned URL + CloudFront invalidation on upload.

### Remaining implementation order

1. Admin dashboard improvements (visitor breakdown, JWT auth, content management)
2. Server-side GitHub activity cache (replace `VITE_GITHUB_TOKEN` workaround)
3. Migrate i18n content arrays → DynamoDB `portfolio_content` table
4. Resume upload (S3 presigned URL)
5. Content editing forms in admin panel

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

`src/services/api.ts` is a thin fetch wrapper pointing at `VITE_API_BASE_URL`. When the env var is unset (local dev without backend), all calls return safe fallbacks so the UI works without infrastructure.

Interfaces exported: `InfraStatus`, `ContactPayload`, `ContactMessage`.

Functions exported:
- `getInfraStatus()` — polls GET /status every 60s via `useInfraStatus` hook
- `fetchVisitorCount()` — POST /visitors (increments on page load, called once from `useVisitorCount`)
- `getVisitorCount()` — GET /visitors (read-only, used in admin panel)
- `sendContactMessage(payload)` — POST /contact
- `getContacts()` — GET /contacts, returns `ContactMessage[]` sorted newest first

### GitHub activity

`useGithubActivity` in `src/hooks/useGithubActivity.ts` fetches from the public GitHub API directly from the browser. Results are cached in `localStorage` for 1 hour (key: `github_activity_cache`). `SKIP_REPOS` filters out forked/unwanted repos.

All requests include `Authorization: Bearer $VITE_GITHUB_TOKEN` when the env var is set — this raises the rate limit from 60 to 5000 req/hour and prevents the 403 that happens on shared IPs. The token must have only public repository read access (fine-grained PAT, no extra permissions needed).

### InfraStatusPanel

`src/components/InfraStatusPanel.tsx` + `src/hooks/useInfraStatus.ts`:
- Polls `GET /status` every 60s
- Header shows the **round-trip response time in ms** (measured via `performance.now()` in the hook, exposed as `responseTime`)
- Shows API status, Frontend status, and Last Commit (SHA + message, `line-clamp-2`)
- **Last Deploy is in the Footer** — shows on the right side of the bottom row, formatted as relative time (e.g. "5m ago"). Hidden when API is unavailable.

### ContactSection

`src/components/ContactSection.tsx`:
- Records `arrivedAt = useRef(Date.now())` on mount
- On submit, sends `timeOnSite` (seconds), `timezone` (`Intl.DateTimeFormat().resolvedOptions().timeZone`), `locale` (`navigator.language`), `referrer` (`document.referrer || 'direct'`) along with name/email/message

### Admin panel

`/admin` route (`src/components/admin/AdminPage.tsx`):
- Client-side password check (hardcoded `"admin"`) — placeholder until real JWT flow is wired up
- Auth state stored in `sessionStorage` as `admin_token`
- Tabs: Overview, Analytics, Content, Settings

**AnalyticsTab** (`src/components/admin/tabs/AnalyticsTab.tsx`):
- On mount: fetches real contacts via `getContacts()` and real visitor total via `getVisitorCount()`
- Messages table columns: Name | Email | Message | Referrer | Device | Country | Time on site | Date
- Visitor country breakdown is currently mock data (no country breakdown endpoint yet)

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
