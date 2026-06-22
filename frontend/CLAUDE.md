# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**Always commit to the `dev` branch.** Never commit directly to `production` or `main` without explicit human approval.

The branch structure is:
- `dev` — active development, where all agent commits go
- `production` — stable, live branch; only receives changes after the human explicitly approves and requests the merge/commit
- `main` — mirrors `dev` (note: currently diverged from dev; reconcile manually when convenient)

When completing a task, commit the changes to `dev`. Only merge or push to `production` if the user explicitly says so after reviewing the result. Deploy is triggered by merging `dev` into `production` and pushing.

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
| Database | DynamoDB | **live** (visitors + contacts + settings + content tables) |
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
  main.tf              # S3, CloudFront OAC, SSM params, GitHub Actions IAM user, S3 CORS config
  lambda.tf            # Lambda exec role + all Lambda functions (zipped via archive_file) + IAM policies
  api_gateway.tf       # HTTP API, $default stage, all routes + Lambda permissions
  dynamodb.tf          # visitors + contacts + settings + content tables
  ses.tf               # SES email identity + Lambda SES IAM policy
  outputs.tf           # CloudFront URL, API GW URL, S3 bucket, IAM keys
  terraform.tfvars.example
```

Run order: `terraform init` → `terraform plan` → `terraform apply`. After first apply, copy outputs to GitHub secrets.

For Lambda hotfixes without a full CI/CD cycle:
```bash
terraform apply -target=aws_lambda_function.<name>
```

SSM parameters managed by Terraform (initial values), overwritten by CI on every deploy:
- `/portfolio/version` — full git SHA
- `/portfolio/last-deploy` — ISO 8601 timestamp
- `/portfolio/last-commit-sha` — 7-char short SHA
- `/portfolio/last-commit-message` — commit subject line

### DynamoDB tables — all `PAY_PER_REQUEST`

**`cloud-portfolio-visitors-prod`**
- PK: `pk` (String) — `"TOTAL"` for global count, `"COUNTRY#BR"` etc. for per-country
- Attribute: `count` (Number) — atomically incremented with `ADD`
- `GET /visitors` scans all items → `{ count, countries: [{code, count}] }`

**`cloud-portfolio-contacts-prod`**
- PK: `id` (String) — `"${Date.now()}-${randomSuffix}"` (sorts newest-first lexicographically)
- Attributes: `name`, `email`, `message`, `referrer`, `device`, `timezone`, `locale`, `timeOnSite` (Number, seconds), `country`, `ip`, `receivedAt` (ISO 8601), `read` (Boolean)
- `read` absent on older items — treated as unread wherever `!m.read`

**`cloud-portfolio-settings-prod`**
- PK: `key` (String)
- Attribute: `value` (String)
- Current keys: `open_to_work` (`"true"` / `"false"`)

**`cloud-portfolio-content-prod`**
- PK: `type` (String) — `"about"`, `"experience"`, `"projects"`, `"certifications"`
- SK: `lang` (String) — `"en"`, `"pt"`
- Attribute: `data` (String, JSON-encoded payload)
- About shape: `{ paragraphs: string[], skills?: string[] }`
- Experience shape: `ExperienceItem[]`
- Projects shape: `{ items: Project[], showcaseItems: VideoProject[] }`
- Certifications shape: `Certification[]`

### Backend — `backend/functions/`

```
backend/functions/
  status/
    index.mjs          # GET /status — reads 4 SSM params → { api, frontend, version, lastDeploy, lastCommit }
  visitors/
    index.mjs          # GET /visitors — Scan → { count, countries: [{code,count}] sorted desc }
                       # POST /visitors — atomically increments TOTAL + COUNTRY#xx → { count }
  contact/
    index.mjs          # POST /contact — validates, sends HTML+text SES email, PutItem to contacts table
  contacts/
    index.mjs          # GET /contacts — Scan contacts table, unmarshall, sort by id desc → { items }
  contacts-patch/
    index.mjs          # PATCH /contacts/{id} — UpdateItem sets read=true
  settings/
    index.mjs          # GET /settings — Scan settings table → { key: value } map
                       # PATCH /settings/{key} — UpdateItem sets value attribute
  resume/
    index.mjs          # GET /resume/presign?lang=en|pt — getSignedUrl for S3 PutObject (5 min expiry)
                       # POST /resume/publish — CloudFront CreateInvalidation for /resume/*
                       # CloudFront client must use region: 'us-east-1' explicitly
  content/
    index.mjs          # GET /content — Scan entire content table → { [type]: { [lang]: parsedData } }
                       # PUT /content/{type}?lang=en|pt — PutItemCommand with JSON-encoded data attribute
```

Lambda runtime: `nodejs20.x`. All `@aws-sdk/*` clients available at runtime without bundling. CORS headers in every Lambda (`Access-Control-Allow-Origin: *`).

### Live API endpoints

| Method | Path | Lambda | Description |
|---|---|---|---|
| GET | `/status` | status | SSM params → health + lastDeploy + lastCommit |
| GET | `/visitors` | visitors | `{ count, countries: [{code,count}] }` |
| POST | `/visitors` | visitors | increments counter, returns `{ count }` |
| POST | `/contact` | contact | sends SES email + saves to contacts table |
| GET | `/contacts` | contacts_get | all submissions newest-first, includes `read` field |
| PATCH | `/contacts/{id}` | contacts_patch | marks message as read |
| GET | `/settings` | settings | `{ open_to_work: "true"\|"false", ... }` map |
| PATCH | `/settings/{key}` | settings | updates single setting value |
| GET | `/resume/presign` | resume | `?lang=en\|pt` → `{ uploadUrl }` |
| POST | `/resume/publish` | resume | CloudFront invalidation for `/resume/*` |
| GET | `/content` | content | `{ [type]: { [lang]: data } }` for all types and both langs |
| PUT | `/content/{type}` | content | `?lang=en\|pt` — replaces full array for that type+lang |

### Lambda IAM permissions

Single `lambda_exec` role shared by all functions:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `ssm:GetParameters` on `arn:aws:ssm:*:*:parameter/portfolio/*`
- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Scan` on visitors table
- `dynamodb:PutItem`, `dynamodb:Scan`, `dynamodb:UpdateItem` on contacts table
- `dynamodb:Scan`, `dynamodb:UpdateItem` on settings table
- `dynamodb:Scan`, `dynamodb:PutItem` on content table
- `s3:PutObject` on `${frontend_bucket}/resume/*`
- `cloudfront:CreateInvalidation` on CloudFront distribution
- `ses:SendEmail` on the SES email identity + `configuration-set/*`

### Contact Lambda details

`backend/functions/contact/index.mjs`:
- Validates `name`, `email`, `message` (400 if missing)
- Reads visitor metadata: `cloudfront-viewer-country` header, `requestContext.http.sourceIp`, `user-agent` parsed to `"Desktop · macOS · Chrome"` format
- Receives from frontend: `timeOnSite` (seconds), `timezone` (IANA), `locale` (`navigator.language`), `referrer` (`document.referrer || 'direct'`), `device` (parsed UA string)
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

`main.tsx` → `App.tsx` sets up `BrowserRouter` + `SettingsProvider` + `ContentProvider` + `LangProvider`, then routes:
- `/` → `Portfolio` (the public-facing page)
- `/admin/*` → `AdminPage` (protected dashboard)

Provider order matters: `SettingsProvider` → `ContentProvider` → `LangProvider`. `LangProvider` calls `useContent()` internally, so `ContentProvider` must be its ancestor.

`Portfolio.tsx` composes sections: `Navbar → Hero → About → ExperienceSection → ProjectsSection → CertificationsSection → ContactSection → Footer`.

### Internationalisation (i18n)

All user-visible text lives in `src/i18n/en.ts` and `src/i18n/pt.ts`. The `Translations` interface in `src/i18n/types.ts` is the single source of truth. Components consume via `useLang()` from `src/i18n/index.tsx` (`{ lang, t, setLang }`). Language persisted to `localStorage`.

**Content arrays** (`projects.items`, `showcaseItems`, `experience.items`, `certifications.items`, `about.paragraphs`, `about.skills`) start from the static `en.ts`/`pt.ts` values but are overridden at runtime by `ContentContext` data from DynamoDB. No component needs to change — the `LangProvider` merges everything into `t` transparently.

**Typed content shapes** in `src/types/index.ts`:
- `ExperienceItem` — company, role, period, location?, description, highlights[], stack[]
- `Project` — title, description, stack[], repoUrl?, liveUrl?, featured?
- `VideoProject` — title, subtitle?, description, year, stack[], videoUrl, aspectRatio?, liveUrl?, repoUrl?, youtubeUrl?
- `Certification` — name, issuer, year?, credentialUrl?

### Content merge flow

```
GET /content (on app load)
  → ContentProvider stores in state + localStorage
    → LangProvider useMemo merges into t
      → t.about.paragraphs / t.experience.items / etc.
        → all section components (unchanged)
```

If the API is unavailable, `content` is `null` and `t` falls back to the static `en.ts`/`pt.ts` values.

### Theming

Dark mode uses CSS class strategy (`dark` on `<html>`). Tailwind v4 configured in `src/index.css` with `@custom-variant dark`. Accent color scale (`accent-*`) maps to a cyan/AWS palette. `useTheme` (`src/hooks/useTheme.ts`) syncs React state with DOM class and `localStorage`.

### Section layout pattern

Every content section uses `<Section id="..." eyebrow="..." title="...">` from `src/components/ui/Section.tsx` — wraps in `<Container>` + Framer Motion scroll-reveal (`whileInView`, `once: true`). Nav anchors rely on matching `id` props.

### Expandable panels

`GitHubPanel` and `VideoProjectCard` use the same pattern:
1. Always-visible content on top
2. `AnimatePresence` + `motion.div` with `height: 0 → auto`
3. Expand/collapse `<button>` **after** the `AnimatePresence` block

### Video files

`public/showcase/video/` — all three MP4 files are encoded with `-movflags faststart` (moov atom at byte ~32, immediately after ftyp). **Critical for CloudFront range requests.** If replacing a video, always run:
```bash
ffmpeg -i input.mp4 -c copy -movflags faststart output.mp4
```
Without faststart, the browser sends a range request to the end of the file to read the moov atom (metadata), which fails on cold CloudFront edges.

### Backend / API

`src/services/api.ts` is a thin fetch wrapper. When `VITE_API_BASE_URL` is unset, all calls return safe fallbacks.

Exported interfaces: `InfraStatus`, `ContactPayload`, `ContactMessage`, `VisitorStats`, `RawContent`, `ContentAbout`, `ContentProjects`.

Exported functions:
- `getInfraStatus()` — GET /status (used by `useInfraStatus`, polls every 60s)
- `fetchVisitorCount()` — POST /visitors (increments on page load, once from `useVisitorCount`)
- `getVisitorStats()` — GET /visitors, returns `VisitorStats { count, countries }` (admin)
- `getVisitorCount()` — wrapper around `getVisitorStats()` returning only the count
- `sendContactMessage(payload)` — POST /contact
- `getContacts()` — GET /contacts, returns `ContactMessage[]` sorted newest-first
- `patchContact(id)` — PATCH /contacts/{id}, marks as read
- `getSettings()` — GET /settings, returns `Record<string, string>`
- `patchSetting(key, value)` — PATCH /settings/{key}
- `getResumeUploadUrl(lang)` — GET /resume/presign?lang=en|pt → `{ uploadUrl }`
- `publishResume()` — POST /resume/publish (CloudFront invalidation)
- `getContent()` — GET /content, returns `RawContent | null`
- `putContent(type, lang, data)` — PUT /content/{type}?lang=en|pt

### GitHub activity

`useGithubActivity` fetches from GitHub API directly in the browser, cached in `localStorage` for 1h (`github_activity_cache`). `SKIP_REPOS` filters unwanted repos. Includes `Authorization: Bearer $VITE_GITHUB_TOKEN` when set (5000 req/h vs 60).

### InfraStatusPanel

`src/components/InfraStatusPanel.tsx` + `src/hooks/useInfraStatus.ts`:
- Polls GET /status every 60s; header shows round-trip ms via `performance.now()`
- Shows API status, Frontend status, Last Commit (SHA inline + message `line-clamp-2`)
- **Last Deploy is in the Footer** (right side, relative time). Hidden when API unavailable.

### SettingsContext

`src/contexts/SettingsContext.tsx` — wraps the entire app (outermost provider):
- Reads `localStorage('portfolio_settings')` synchronously on mount → instant render (no flash)
- Fetches `GET /settings` on mount → updates state + writes back to `localStorage`
- Listens for `storage` events → syncs across open tabs in real time
- `updateSetting(key, value)` — calls `PATCH /settings/{key}` + updates state + writes `localStorage`
- `useSettings()` exposes `{ settings, updateSetting }`

Currently managed: `openToWork: boolean`.

**How `open_to_work` flows:** `ContentTab` toggle → `updateSetting('open_to_work', 'true'|'false')` → DynamoDB PATCH → localStorage write → `storage` event → all open tabs update `Hero.tsx` via `useSettings()` immediately.

### ContentContext

`src/contexts/ContentContext.tsx` — wraps `LangProvider`:
- Reads `localStorage('portfolio_content')` synchronously on mount → cached content available immediately
- Fetches `GET /content` on mount → updates state + writes `localStorage`
- Listens for `storage` events → syncs across tabs when admin saves content
- `refreshContent()` — re-fetches from API; called by editors after `putContent()` so the live site updates immediately
- `useContent()` exposes `{ content: RawContent | null, refreshContent }`

Same pattern as SettingsContext: localStorage cache → instant render, API fetch → update, storage event → cross-tab sync.

### LangProvider (content merge)

`src/i18n/index.tsx`:
- Calls `useContent()` internally
- `t` is computed with `useMemo([lang, content])` — merges DynamoDB content over the static i18n arrays:
  ```
  t.about.paragraphs    ← content.about[lang].paragraphs    ?? en/pt.about.paragraphs
  t.about.skills        ← content.about[lang].skills        ?? en/pt.about.skills
  t.experience.items    ← content.experience[lang]          ?? en/pt.experience.items
  t.projects.items      ← content.projects[lang].items      ?? en/pt.projects.items
  t.projects.showcaseItems ← content.projects[lang].showcaseItems ?? en/pt.projects.showcaseItems
  t.certifications.items ← content.certifications[lang]     ?? en/pt.certifications.items
  ```
- All section components continue reading from `t.*` with no changes.

### ContactSection

`src/components/ContactSection.tsx` records `arrivedAt = useRef(Date.now())` on mount. On submit sends `timeOnSite`, `timezone` (`Intl.DateTimeFormat().resolvedOptions().timeZone`), `locale` (`navigator.language`), `referrer` (`document.referrer || 'direct'`).

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

### Admin panel — current state

`/admin` route (`src/components/admin/AdminPage.tsx`):
- Client-side password check (hardcoded `"admin"`) — placeholder until JWT flow
- Auth state stored in `sessionStorage` as `admin_token`
- Sidebar tabs: Analytics, Messages (with unread badge), Resume, Content

**AdminDashboard** (`src/components/admin/AdminDashboard.tsx`):
- Fetches `getContacts()` on mount to compute `unreadCount`
- Passes `onMarkRead` callback to `MessagesTab` to decrement badge optimistically

**AnalyticsTab** (`src/components/admin/tabs/AnalyticsTab.tsx`) — fully live:
- Fetches `getVisitorStats()` + `getContacts()` on mount
- Summary cards: Total Visitors, Countries Reached, Messages — all real DynamoDB data
- "Visitors by Country" horizontal bar chart — real data; countries only appear after CloudFront traffic (header `cloudfront-viewer-country`)

**MessagesTab** (`src/components/admin/tabs/MessagesTab.tsx`) — fully live:
- Full inbox with unread indicator (cyan dot + bold name for unread messages)
- `table-fixed` + `<colgroup>` with `44%` message column → `line-clamp-2` preview works correctly
- Click row → optimistic mark-as-read in local state → fires `patchContact(id)` → opens `MessageModal`
- `MessageModal`: full scrollable message, visitor metadata grid (referrer, device, country, timezone, locale, time on site, IP), "Reply" button (`mailto:${email}?subject=Re: [Portfolio] ${name}`), closes on Esc or backdrop click
- Pagination: 10 per page, prev/next + numbered pages with ellipsis

**ResumeTab** (`src/components/admin/tabs/ResumeTab.tsx`) — fully live:
- PDF drag-and-drop or file picker for EN and PT resumes (validates PDF + 5MB limit)
- `handleUpload`: `getResumeUploadUrl(lang)` → PUT to S3 with `Content-Type: application/pdf` → `publishResume()` (CloudFront invalidation)
- Animated step-by-step progress (Getting URL → Uploading → Publishing → Done)
- Files land at `s3://<bucket>/resume/en/Alessandro_Bezerra_Java_Backend_Engineer.pdf` (filename hardcoded in Lambda)

**ContentTab** (`src/components/admin/tabs/ContentTab.tsx`) — partially live:
- `AvailabilityToggle` — fully wired; reads `settings.openToWork`, calls `updateSetting('open_to_work', ...)`, shows "Saved ✓" for 2s
- Lang switcher (EN / PT) — controls which language version of content is being edited; separate from the site's display language
- Section tabs: About / Experience / Projects / Certifications
- **About editor** — fully live:
  - Paragraphs: list of `<textarea>` fields, one per paragraph; add/remove buttons
  - Skills: one skill per line in a `<textarea>` (same list used for EN and PT)
  - Save calls `putContent('about', lang, { paragraphs, skills })` → `refreshContent()` → live site updates immediately without deploy
  - Editor state initializes from `ContentContext` (localStorage cache) with fallback to static `en.ts`/`pt.ts`; re-inits on lang tab switch
- Experience, Projects, Certifications — `<ComingSoonBlock>` placeholder

---

## Roadmap — Next features

### Phase 2b (continued) · Experience, Projects, Certifications editors

The data layer is fully wired (DynamoDB table + Lambda + ContentProvider + LangProvider merge). Only the admin editor UI components remain.

#### Experience editor (step 7)

Each `ExperienceItem`: company, role, period, location?, description, highlights[], stack[].

**UI:**
- List of collapsible cards (one per item)
- Collapsed: company + role + period header
- Expanded: all fields — company, role, period, location (inputs); description (textarea); highlights (repeatable list of inputs, add/remove); stack (tag input, one per line like skills)
- Add / delete per card; up/down arrows to reorder
- "Save All" → `putContent('experience', lang, items)` → `refreshContent()`

Language note: EN and PT versions are stored independently. Company/role/period/stack are typically identical — the user copies them. Description and highlights are translated.

#### Certifications editor (step 8)

Each `Certification`: name, issuer, year?, credentialUrl?

**UI:**
- Simple card list (simpler than experience — no nested arrays)
- Inline edit: name, issuer, year, credentialUrl inputs per card
- Add / delete / reorder
- "Save All" → `putContent('certifications', lang, items)` → `refreshContent()`

Language note: certifications are language-independent in practice. The editor stores the same data under both EN and PT.

#### Projects editor (step 9)

Two sub-sections with inner tabs: **Featured** (`items: Project[]`) and **Showcase** (`showcaseItems: VideoProject[]`).

Featured (Project[]):
- title, description (textarea), stack (one per line), repoUrl, liveUrl, featured (checkbox)

Showcase (VideoProject[]):
- title, subtitle, year, description (textarea — long multi-paragraph), stack, videoUrl (path under `/showcase/video/`), aspectRatio, liveUrl, repoUrl, youtubeUrl
- Note: videoUrl stores the filename path only; uploading a new video file requires uploading the MP4 to S3 separately

"Save All" → `putContent('projects', lang, { items, showcaseItems })` → `refreshContent()`

#### Implementation pattern (same for all three)

Each editor follows the About editor pattern:
1. Initialize state from `content?.[type]?.[editorLang] ?? static_fallback`
2. Re-init on `editorLang` change
3. Local state for the array being edited
4. On save: `putContent(type, editorLang, localState)` → `refreshContent()`
5. "Save All" button with "Saved ✓" feedback

No backend changes needed — the Lambda and DynamoDB table are already live.
