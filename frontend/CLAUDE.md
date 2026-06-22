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
  dynamodb.tf          # visitors table + contacts table (+ settings table, planned)
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
- PK: `pk` (String) — `"TOTAL"` for global count, `"COUNTRY#BR"` etc. for per-country
- Attribute: `count` (Number) — atomically incremented with `ADD`
- `GET /visitors` scans all items to return `{ count, countries: [{code, count}] }`

**`cloud-portfolio-contacts-prod`** — contact form submissions
- PK: `id` (String) — `"${Date.now()}-${randomSuffix}"` (sorts newest-first lexicographically)
- Attributes: `name`, `email`, `message`, `referrer`, `device`, `timezone`, `locale`, `timeOnSite` (Number, seconds), `country`, `ip`, `receivedAt` (ISO 8601)
- Planned: `read` (Boolean) for unread tracking

### Backend — `backend/functions/`

```
backend/
  functions/
    status/
      index.mjs   # GET /status — reads 4 SSM params, returns { api, frontend, version, lastDeploy, lastCommit }
    visitors/
      index.mjs   # GET /visitors — scans table, returns { count, countries: [{code,count}] sorted by count desc }
                  # POST /visitors — atomically increments TOTAL + COUNTRY#xx, returns { count }
    contact/
      index.mjs   # POST /contact — validates, sends HTML+text SES email, saves full record to contacts table
    contacts/
      index.mjs   # GET /contacts — scans contacts table, returns { items } sorted by id desc
```

Lambda runtime: `nodejs20.x`. All `@aws-sdk/*` clients available at runtime without bundling. CORS headers in every Lambda (`Access-Control-Allow-Origin: *`).

### Live API endpoints

| Method | Path | Lambda | Description |
|---|---|---|---|
| GET | `/status` | status | SSM params → health + lastDeploy + lastCommit |
| GET | `/visitors` | visitors | `{ count, countries: [{code,count}] }` |
| POST | `/visitors` | visitors | increments counter, returns `{ count }` |
| POST | `/contact` | contact | sends SES email + saves to contacts table |
| GET | `/contacts` | contacts_get | all submissions newest-first |

### Lambda IAM permissions

Single `lambda_exec` role shared by all functions:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `ssm:GetParameters` on `arn:aws:ssm:*:*:parameter/portfolio/*`
- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Scan` on visitors table
- `dynamodb:PutItem`, `dynamodb:Scan` on contacts table
- `ses:SendEmail` on the SES email identity + `configuration-set/*`

### Contact Lambda details

`backend/functions/contact/index.mjs`:
- Validates `name`, `email`, `message` (400 if missing)
- Reads visitor metadata: `cloudfront-viewer-country` header, `requestContext.http.sourceIp`, `user-agent` parsed to `"Desktop · macOS · Chrome"` format
- Receives from frontend: `timeOnSite` (seconds), `timezone` (IANA), `locale` (`navigator.language`), `referrer` (`document.referrer || 'direct'`)
- Sends branded HTML email from `Alessandro Bezerra da Silva <CONTACT_EMAIL>`, Reply-To set to sender
- After email: writes full record to DynamoDB; DynamoDB failure is caught so email always delivers

## Commands

```bash
npm run dev       # start dev server (Vite, http://localhost:5173)
npm run build     # TypeScript check + Vite production build → dist/
npm run lint      # ESLint
npm run preview   # serve the dist/ build locally
```

## Architecture

### Routing & entry point

`main.tsx` → `App.tsx` sets up `BrowserRouter` + `LangProvider`, then routes:
- `/` → `Portfolio` (the public-facing page)
- `/admin/*` → `AdminPage` (protected dashboard)

`Portfolio.tsx` composes sections: `Navbar → Hero → About → ExperienceSection → ProjectsSection → CertificationsSection → ContactSection → Footer`.

### Internationalisation (i18n)

All user-visible text lives in `src/i18n/en.ts` and `src/i18n/pt.ts`. The `Translations` interface in `src/i18n/types.ts` is the single source of truth. Components consume via `useLang()` from `src/i18n/index.tsx` (`{ lang, t, setLang }`). Language persisted to `localStorage`.

**Content arrays** (`projects.items`, `showcaseItems`, `experience.items`, `certifications.items`) are part of the translation objects, not separate files. `src/data/projects.ts`, `src/data/experience.ts`, `src/data/certifications.ts` exist as fallbacks but the live content comes from `en.ts`/`pt.ts`.

### Theming

Dark mode uses CSS class strategy (`dark` on `<html>`). Tailwind v4 configured in `src/index.css` with `@custom-variant dark`. Accent color scale (`accent-*`) maps to a cyan/AWS palette. `useTheme` (`src/hooks/useTheme.ts`) syncs React state with DOM class and `localStorage`.

### Section layout pattern

Every content section uses `<Section id="..." eyebrow="..." title="...">` from `src/components/ui/Section.tsx` — wraps in `<Container>` + Framer Motion scroll-reveal (`whileInView`, `once: true`). Nav anchors rely on matching `id` props.

### Expandable panels

`GitHubPanel` and `VideoProjectCard` use the same pattern:
1. Always-visible content on top
2. `AnimatePresence` + `motion.div` with `height: 0 → auto`
3. Expand/collapse `<button>` **after** the `AnimatePresence` block

### Backend / API

`src/services/api.ts` is a thin fetch wrapper. When `VITE_API_BASE_URL` is unset, all calls return safe fallbacks.

Exported interfaces: `InfraStatus`, `ContactPayload`, `ContactMessage`, `VisitorStats`.

Exported functions:
- `getInfraStatus()` — GET /status (used by `useInfraStatus`, polls every 60s)
- `fetchVisitorCount()` — POST /visitors (increments on page load, called once from `useVisitorCount`)
- `getVisitorStats()` — GET /visitors, returns `VisitorStats { count, countries }` (used in admin)
- `getVisitorCount()` — wrapper around `getVisitorStats()` returning only the count
- `sendContactMessage(payload)` — POST /contact
- `getContacts()` — GET /contacts, returns `ContactMessage[]` sorted newest-first

### GitHub activity

`useGithubActivity` fetches from GitHub API directly in the browser, cached in `localStorage` for 1h (`github_activity_cache`). `SKIP_REPOS` filters unwanted repos. Includes `Authorization: Bearer $VITE_GITHUB_TOKEN` when set (5000 req/h vs 60).

### InfraStatusPanel

`src/components/InfraStatusPanel.tsx` + `src/hooks/useInfraStatus.ts`:
- Polls GET /status every 60s; header shows round-trip ms via `performance.now()`
- Shows API status, Frontend status, Last Commit (SHA inline + message `line-clamp-2`)
- **Last Deploy is in the Footer** (right side, relative time). Hidden when API unavailable.

### ContactSection

`src/components/ContactSection.tsx` records `arrivedAt = useRef(Date.now())` on mount. On submit sends `timeOnSite`, `timezone` (`Intl.DateTimeFormat().resolvedOptions().timeZone`), `locale` (`navigator.language`), `referrer` (`document.referrer || 'direct'`).

### Admin panel — current state

`/admin` route (`src/components/admin/AdminPage.tsx`):
- Client-side password check (hardcoded `"admin"`) — placeholder until JWT flow
- Auth state stored in `sessionStorage` as `admin_token`
- Sidebar tabs: Analytics, Resume, Content

**AnalyticsTab** (`src/components/admin/tabs/AnalyticsTab.tsx`) — fully live:
- Fetches `getVisitorStats()` (total + country breakdown) and `getContacts()` on mount
- Summary cards: Total Visitors, Countries, Messages — all real data
- "Visitors by Country" bar chart — real data from DynamoDB Scan; countries only appear after real CloudFront traffic (country comes from `cloudfront-viewer-country` header, absent in local dev)
- Messages table: 5 columns (Name, Email, Message 2-line preview, Country, Date); `table-fixed` with `<colgroup>` ensures correct truncation
- Click any row → `MessageModal`: full message with scroll, visitor metadata grid (referrer, device, country, timezone, locale, time on site, IP), formatted date footer; closes with Esc or click outside
- Pagination: 10 per page, prev/next + page numbers with ellipsis

**ResumeTab** (`src/components/admin/tabs/ResumeTab.tsx`) — UI only, upload not wired:
- Drag-and-drop PDF upload areas for EN and PT resumes
- "Upload & Publish" button disabled (no presigned URL endpoint yet)

**ContentTab** (`src/components/admin/tabs/ContentTab.tsx`) — UI scaffolded, no backend:
- OpenToWork toggle (reads `src/data/profile.ts`, disabled — no backend yet)
- About text editor (disabled — no backend yet)
- Experience, Projects, Certifications — "coming soon" placeholders

### Scroll spy

`useScrollSpy` (`src/hooks/useScrollSpy.ts`) returns `[activeId, notifyNavClick]`. Listens to `scroll`, compares `absoluteTop` (`getBoundingClientRect().top + scrollY`) against `scrollY + 250`. Last section forced active at bottom. **Do not use IntersectionObserver.**

`notifyNavClick(id)` must be called from every nav `<a onClick>` — sets active immediately and suppresses spy for 1200ms via `suppressUntil` ref.

Section components must **not** have `scroll-mt-*` — `scroll-padding-top: 4rem` on `html` already handles the offset.

### View Transitions

Theme and language toggles use `document.startViewTransition`. Set `data-vt="theme"` or `data-vt="lang"` on `<html>` before calling. CSS in `src/index.css`:
- **Theme**: circular reveal from button origin (`--vt-x`/`--vt-y` CSS vars)
- **Lang**: old snapshot stays (`z-index: 0`), new fades in on top (`z-index: 1`) — avoids black flash

Always use `flushSync(() => setState(...))` inside the transition callback.

### Background effects

`BackgroundEffects.tsx` — fixed full-screen layer (`z-index: -10`):
1. **Dot grid** — radial-gradient dots (28px grid), masked `linear-gradient(to right, black, transparent 18%, transparent 82%, black)` — dots visible only at left/right edges
2. **Orb 1** — top-right, cyan, 28s drift
3. **Orb 2** — bottom-left, violet, 34s drift
4. **Orb 3** — centered, subtle cyan, 22s drift
5. **Mouse glow** — fixed overlay, `--mouse-x`/`--mouse-y` CSS vars updated via `mousemove`

**Critical:** background color must be on `body`, not `html` — setting it on `html` hides fixed elements with negative `z-index`.

### FOUC prevention

`index.html` inline `<script>` reads `localStorage('theme')`, adds `class="dark"` to `<html>` before first paint. Inline `<style>` sets `body { background }` for both modes.

---

## Roadmap — Next features

### Phase 1 · Messages tab (inbox in admin)

**Goal:** separate the messages list from Analytics, add unread tracking and quick reply.

**Backend changes:**
1. Add `read` (Boolean, default false) to the contacts DynamoDB schema — new items already get it via contact Lambda; existing items treated as unread if field absent
2. New Lambda `backend/functions/contacts-patch/index.mjs` — `PATCH /contacts/{id}` sets `read: true` using `UpdateItemCommand`
3. Add `dynamodb:UpdateItem` on contacts table to the IAM policy
4. Wire `PATCH /contacts/{id}` route in `api_gateway.tf`

**Frontend changes:**
1. Add `Messages` tab to `AdminDashboard.tsx` sidebar (with unread count badge)
2. Move the messages table + modal out of `AnalyticsTab` into a new `MessagesTab.tsx`
3. `AnalyticsTab` keeps only the 3 summary cards + country chart
4. `MessagesTab`: on row click, marks message as read (`PATCH /contacts/{id}`) and opens modal
5. Unread count badge: number of items where `read !== true`, shown on the sidebar nav item
6. Modal footer: "Reply" button opens `mailto:${email}?subject=Re: [Portfolio] ...`
7. Add `patchContact(id)` to `api.ts`

**Key detail:** `GET /contacts` must include the `read` field in the returned items. Since `unmarshall` already handles it, no Lambda change needed there — just add `read` to the `ContactMessage` interface in `api.ts`.

---

### Phase 2 · Content CMS

**Goal:** edit portfolio content (OpenToWork toggle + About text) from the admin without a code rebuild.

#### Phase 2a — Settings (fast, high value)

Covers the two most useful controls: OpenToWork badge visibility and About section text (EN + PT).

**Backend:**
1. New DynamoDB table `cloud-portfolio-settings-prod` (PK: `key` String, PAY_PER_REQUEST)
   - Seed items: `{ key: "open_to_work", value: "false" }`, `{ key: "about_en", value: "<current text>" }`, `{ key: "about_pt", value: "<current text>" }`
2. New Lambda `backend/functions/settings/index.mjs`:
   - `GET /settings` — scans table, returns `{ [key]: value }` map
   - `PUT /settings/{key}` — `UpdateItemCommand` sets the `value` attribute
3. Add settings table + Lambda + IAM (`dynamodb:GetItem`, `dynamodb:Scan`, `dynamodb:UpdateItem`) in Terraform
4. Wire `GET /settings` and `PUT /settings/{key}` in `api_gateway.tf`

**Frontend:**
1. Add `getSettings()` and `putSetting(key, value)` to `api.ts`
2. On app load (`App.tsx`), fetch settings once and store in a `SettingsContext` (or merge into the existing `LangProvider`)
3. `Hero.tsx` reads `openToWork` from settings context instead of `profile.ts` hardcoded value
4. `About.tsx` reads paragraphs from settings context for the active language; falls back to `en.ts`/`pt.ts` if API unavailable
5. `ContentTab`: wire the OpenToWork toggle and About editor to call `putSetting()` on save; show a success toast on save

#### Phase 2b — Projects, Experience, Certifications (bigger, later)

Covers full content management for the three main portfolio sections.

**DynamoDB schema** — single table `cloud-portfolio-content-prod`:
- PK: `type` (String) — `"projects"`, `"experience"`, `"certifications"`
- SK: `lang` (String) — `"en"`, `"pt"`
- Attribute: `items` (String, JSON-encoded array) — the full array matching the current `en.ts`/`pt.ts` data shape

**Backend:**
1. Add `cloud-portfolio-content-prod` table to `dynamodb.tf`
2. New Lambda `backend/functions/content/index.mjs`:
   - `GET /content/{type}?lang=en` — `GetItemCommand` on `{type, lang}`, returns `{ items }`
   - `PUT /content/{type}?lang=en` — `PutItemCommand` with new `items` JSON — replaces the full array
3. Add IAM `dynamodb:GetItem`, `dynamodb:PutItem` on content table
4. Wire routes in `api_gateway.tf`

**Frontend — data layer change:**
- On app load, fetch `GET /content/projects?lang=en`, `GET /content/experience?lang=en`, `GET /content/certifications?lang=en` (and `pt` variants) in parallel
- Merge into the `LangProvider` context, overriding the hardcoded arrays in `en.ts`/`pt.ts`
- If API is unavailable, fall back silently to the hardcoded arrays (no change in behaviour)
- Seed DynamoDB with the current `en.ts`/`pt.ts` arrays before enabling this

**Admin ContentTab — editors:**
- Projects: list of cards; add / edit / delete; each card has title, description, tags, links, image URL
- Experience: list of entries; add / edit / delete; each has company, role, period, description bullets
- Certifications: list; add / edit / delete; each has name, issuer, date, URL
- Each sub-editor calls `PUT /content/{type}?lang={lang}` on save
- Language switcher (EN / PT) at the top of the tab

**Implementation order within Phase 2b:**
1. Content table + Lambda + routes (Terraform + backend)
2. Seed script (one-time: reads `en.ts`/`pt.ts` and writes to DynamoDB)
3. Frontend data layer (fetch on load, fallback to static)
4. Admin editor UI (projects first, then experience, then certifications)
