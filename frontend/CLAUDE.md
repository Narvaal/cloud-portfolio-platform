# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**Always commit to the `dev` branch.** Never commit directly to `production` or `main` without explicit human approval.

Branch structure:
- `dev` — active development, where all agent commits go
- `production` — stable, live branch; only receives changes after human explicitly approves
- `main` — mirrors `dev` (currently diverged; reconcile manually when convenient)

Deploy is triggered by merging `dev` into `production` and pushing.

Commit message convention: `feat:` / `fix:` / `refactor:` / `docs:` / `chore:`

No `Co-Authored-By` trailers in commits.

## Coding Standards

**Frontend:** functional components and hooks only — no class components, no `any` type.

**Backend (Lambda):** single responsibility per function. All `@aws-sdk/*` clients available at runtime without bundling. CORS headers in every Lambda (`Access-Control-Allow-Origin: *`).

## Commands

```bash
npm run dev       # Vite dev server — http://localhost:5173
npm run build     # TypeScript check + production build → dist/
npm run lint      # ESLint
npm run preview   # serve dist/ locally
```

## Project Overview

Cloud-native portfolio platform on AWS. React SPA frontend, fully serverless backend.

### AWS architecture

| Layer | Tech | Status |
|---|---|---|
| Hosting | S3 + CloudFront (OAC) | **live** |
| CI/CD | GitHub Actions | **live** |
| API | API Gateway HTTP API + Lambda (Node.js 20) | **live** |
| IaC | Terraform (`infra/`) | **live** |
| Secrets / config | SSM Parameter Store | **live** |
| Database | DynamoDB | **live** |
| Email | SES | **live** |

Frontend connects via `VITE_API_BASE_URL`. When unset locally, all API calls return safe fallbacks.

### Environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | GitHub secret + local `.env.production` | API Gateway base URL |
| `VITE_GITHUB_TOKEN` | GitHub secret | Fine-grained read-only PAT — raises GitHub rate limit to 5000 req/h |

### CI/CD — `.github/workflows/deploy-frontend.yml`

Triggers on push to `production` (or `workflow_dispatch`). Steps:
1. `actions/checkout@v4` with `fetch-depth: 0` — full history for `git log --no-merges`
2. `npm ci` + `npm run build` (injects `VITE_*` secrets)
3. `aws s3 sync dist/ s3://$S3_BUCKET/` — assets with long cache, `index.html` no-cache
4. `aws cloudfront create-invalidation` — purges CDN cache
5. `aws ssm put-parameter` — writes last real commit (non-merge) SHA/message/date to `/portfolio/*`

GitHub secrets required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_BASE_URL`, `VITE_GITHUB_TOKEN`.

### Terraform — `infra/`

```
infra/
  versions.tf          # provider AWS ~> 5.0
  variables.tf         # aws_region, project_name, environment, contact_email
  main.tf              # S3, CloudFront OAC, SSM params, GitHub Actions IAM user, S3 CORS
  lambda.tf            # Lambda exec role + all Lambda functions + IAM policies
  api_gateway.tf       # HTTP API, $default stage, all routes + Lambda permissions
  dynamodb.tf          # all DynamoDB tables
  ses.tf               # SES email identity + Lambda SES IAM policy
  outputs.tf           # CloudFront URL, API GW URL, S3 bucket, IAM keys
```

Run order: `terraform init` → `terraform plan` → `terraform apply`.

Lambda hotfix without full CI/CD:
```bash
terraform apply -target=aws_lambda_function.<name>
```

SSM parameters (written by CI on every deploy):
- `/portfolio/version` — full git SHA of merge commit
- `/portfolio/last-deploy` — ISO 8601 timestamp
- `/portfolio/last-commit-sha` — 7-char SHA of last real commit
- `/portfolio/last-commit-message` — subject line of last real commit
- `/portfolio/last-commit-date` — ISO 8601 committer date

### DynamoDB tables — all `PAY_PER_REQUEST`

**`cloud-portfolio-visitors-prod`**
- PK: `pk` (String) — `"TOTAL"` or `"COUNTRY#BR"` etc.
- `count` (Number) — atomically incremented with `ADD`

**`cloud-portfolio-contacts-prod`**
- PK: `id` (String) — `"${Date.now()}-${randomSuffix}"`
- Attributes: `name`, `email`, `message`, `referrer`, `device`, `timezone`, `locale`, `timeOnSite` (Number, seconds), `country`, `ip`, `receivedAt` (ISO 8601), `read` (Boolean)
- `read` absent on older items — treated as unread wherever `!m.read`

**`cloud-portfolio-settings-prod`**
- PK: `key` (String), `value` (String)
- Current keys: `open_to_work` (`"true"` / `"false"`)

**`cloud-portfolio-content-prod`**
- PK: `type` (String) — `"about"`, `"experience"`, `"projects"`, `"certifications"`
- SK: `lang` (String) — `"en"`, `"pt"`
- `data` (String) — JSON-encoded payload
- About: `{ paragraphs: string[], skills?: string[] }`
- Experience: `ExperienceItem[]`
- Projects: `{ items: Project[], showcaseItems: VideoProject[] }`
- Certifications: `Certification[]`

### Backend — `backend/functions/`

```
status/index.mjs         # GET /status — 5 SSM params → { api, frontend, version, lastDeploy, lastCommit }
visitors/index.mjs       # GET /visitors — Scan → { count, countries[] }
                         # POST /visitors — atomically increments TOTAL + COUNTRY#xx → { count }
contact/index.mjs        # POST /contact — validates, sends SES email, PutItem to contacts table
contacts/index.mjs       # GET /contacts — Scan, sort by id desc → { items }
contacts-patch/index.mjs # PATCH /contacts/{id} — UpdateItem sets read=true
settings/index.mjs       # GET /settings → { key: value } map
                         # PATCH /settings/{key} — UpdateItem sets value
resume/index.mjs         # GET /resume/presign?lang=en|pt → presigned S3 PutObject URL (5 min)
                         # POST /resume/publish → CloudFront invalidation for /resume/*
                         # CloudFront client must use region: 'us-east-1' explicitly
content/index.mjs        # GET /content → { [type]: { [lang]: parsedData } }
                         # PUT /content/{type}?lang=en|pt — PutItemCommand with JSON-encoded data
video/index.mjs          # GET /video/list → { files: string[] } — .mp4 filenames in showcase/video/
                         # GET /video/presign?filename=x.mp4 → presigned S3 PutObject URL (5 min)
                         # POST /video/publish → CloudFront invalidation for /showcase/video/*
                         # DELETE /video/{filename} → DeleteObject from S3
```

### Live API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/status` | SSM params → health + lastDeploy + lastCommit |
| GET | `/visitors` | `{ count, countries }` |
| POST | `/visitors` | increments counter → `{ count }` |
| POST | `/contact` | SES email + saves to contacts table |
| GET | `/contacts` | all submissions newest-first, includes `read` |
| PATCH | `/contacts/{id}` | marks message as read |
| GET | `/settings` | `{ open_to_work: "true"\|"false", ... }` |
| PATCH | `/settings/{key}` | updates single setting |
| GET | `/resume/presign` | `?lang=en\|pt` → `{ uploadUrl }` |
| POST | `/resume/publish` | CloudFront invalidation for `/resume/*` |
| GET | `/content` | `{ [type]: { [lang]: data } }` |
| PUT | `/content/{type}` | `?lang=en\|pt` — replaces full payload |
| GET | `/video/list` | `{ files: string[] }` — mp4 filenames |
| GET | `/video/presign` | `?filename=x.mp4` → `{ uploadUrl }` |
| POST | `/video/publish` | CloudFront invalidation for `/showcase/video/*` |
| DELETE | `/video/{filename}` | deletes mp4 from S3 |

### Lambda IAM permissions

Single `lambda_exec` role:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `ssm:GetParameters` on `/portfolio/*`
- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Scan` on visitors table
- `dynamodb:PutItem`, `dynamodb:Scan`, `dynamodb:UpdateItem` on contacts table
- `dynamodb:Scan`, `dynamodb:UpdateItem` on settings table
- `dynamodb:Scan`, `dynamodb:PutItem` on content table
- `s3:PutObject` on `${frontend_bucket}/resume/*`
- `s3:PutObject`, `s3:DeleteObject` on `${frontend_bucket}/showcase/video/*`
- `s3:ListBucket` with `StringLike` condition `s3:prefix = ["showcase/video/*"]`
- `cloudfront:CreateInvalidation` on CloudFront distribution
- `ses:SendEmail` on SES email identity

## Architecture

### Routing & entry point

`main.tsx` → `App.tsx`: `BrowserRouter` + `SettingsProvider` → `ContentProvider` → `LangProvider`, then:
- `/` → `Portfolio` (public page)
- `/admin/*` → `AdminPage` (protected dashboard)

Provider order matters: `LangProvider` calls `useContent()` internally, so `ContentProvider` must be its ancestor.

`Portfolio.tsx`: `Navbar → Hero → About → ExperienceSection → ProjectsSection → CertificationsSection → ContactSection → Footer`.

### Internationalisation (i18n)

Static text in `src/i18n/en.ts` and `src/i18n/pt.ts`. `Translations` interface in `src/i18n/types.ts` is the single source of truth. Components consume via `useLang()` → `{ lang, t, setLang }`. Language persisted to `localStorage`.

Content arrays (`projects.items`, `showcaseItems`, `experience.items`, `certifications.items`, `about.paragraphs`, `about.skills`) are overridden at runtime by DynamoDB data via `ContentContext`. `LangProvider` merges everything into `t` transparently — no component changes needed.

Typed shapes in `src/types/index.ts`:
- `ExperienceItem` — company, role, period, location?, description, highlights[], stack[]
- `Project` — title, description, stack[], repoUrl?, liveUrl?, featured?
- `VideoProject` — title, subtitle?, description, year, stack[], videoUrl, aspectRatio?, liveUrl?, repoUrl?, youtubeUrl?
- `Certification` — name, issuer, year?, credentialUrl?

### Content merge flow

```
GET /content (on app load)
  → ContentProvider: state + localStorage
    → LangProvider useMemo merges into t
      → section components read t.* unchanged
```

Fallback: if API unavailable, `t` uses static `en.ts`/`pt.ts` values.

### Backend / API — `src/services/api.ts`

Thin fetch wrapper. When `VITE_API_BASE_URL` unset, all calls return safe fallbacks.

Exported functions:
- `getInfraStatus()` — GET /status
- `fetchVisitorCount()` — POST /visitors (increments on page load)
- `getVisitorStats()` — GET /visitors → `VisitorStats { count, countries }`
- `sendContactMessage(payload)` — POST /contact
- `getContacts()` — GET /contacts → `ContactMessage[]`
- `patchContact(id)` — PATCH /contacts/{id}
- `getSettings()` — GET /settings → `Record<string, string>`
- `patchSetting(key, value)` — PATCH /settings/{key}
- `getResumeUploadUrl(lang)` — GET /resume/presign
- `publishResume()` — POST /resume/publish
- `getContent()` — GET /content → `RawContent | null`
- `putContent(type, lang, data)` — PUT /content/{type}
- `getVideoList()` — GET /video/list → `string[]`
- `getVideoUploadUrl(filename)` — GET /video/presign
- `publishVideo()` — POST /video/publish
- `deleteVideo(filename)` — DELETE /video/{filename}

### Theming

Dark mode via CSS class (`dark` on `<html>`). Tailwind v4 with `@custom-variant dark` in `src/index.css`. Accent color (`accent-*`) = cyan/AWS palette. `useTheme` syncs state with DOM class and `localStorage`.

**Critical:** background color on `body`, not `html` — setting it on `html` hides fixed elements with negative `z-index`.

### Section layout pattern

`<Section id="..." eyebrow="..." title="...">` from `src/components/ui/Section.tsx` — wraps in `<Container>` + Framer Motion scroll-reveal (`whileInView`, `once: true`). Nav anchors match `id` props.

Section components must **not** have `scroll-mt-*` — `scroll-padding-top: 4rem` on `html` handles the offset.

### Scroll spy

`useScrollSpy` returns `[activeId, notifyNavClick]`. Listens to `scroll`, compares `absoluteTop` against `scrollY + 250`. Last section forced active at bottom. **Do not use IntersectionObserver.**

`notifyNavClick(id)` must be called from every nav `<a onClick>` — sets active immediately and suppresses spy for 1200ms.

### View Transitions

Theme and language toggles use `document.startViewTransition`. Set `data-vt="theme"` or `data-vt="lang"` on `<html>` before calling.
- **Theme**: circular reveal from button origin (`--vt-x`/`--vt-y` CSS vars)
- **Lang**: old snapshot stays (`z-index: 0`), new fades in on top (`z-index: 1`) — avoids black flash

Always use `flushSync(() => setState(...))` inside the transition callback.

### Expandable panels

`GitHubPanel` and `VideoProjectCard` pattern:
1. Always-visible content on top
2. `AnimatePresence` + `motion.div` with `height: 0 → auto`
3. Expand/collapse `<button>` **after** the `AnimatePresence` block

### Video files

`public/showcase/video/` — MP4 files must be encoded with `-movflags faststart` (moov atom near start). **Critical for CloudFront range requests.** When replacing a video:
```bash
ffmpeg -i input.mp4 -c copy -movflags faststart output.mp4
```
Without faststart, browsers send a range request to the end of the file to read moov atom metadata, which fails on cold CloudFront edges.

### FOUC prevention

`index.html` inline `<script>` reads `localStorage('theme')`, adds `class="dark"` to `<html>` before first paint. Inline `<style>` sets `body { background }` for both modes.

### GitHub activity

`useGithubActivity` + `GitHubPanel` — hybrid data strategy:
1. **Per-repo commits** (`GET /repos/{user}/{repo}/commits?sha=dev&per_page=3`): tries `dev` branch, falls back to `HEAD`. Always real-time.
2. **Search API** (`GET /search/commits?q=author:{user}&sort=committer-date`): captures all repos/branches but has indexing delay.
3. Merged, deduplicated by SHA, merge commits filtered, sorted newest-first, sliced to 3.

Cache: `localStorage('github_activity_cache')`, TTL 5 minutes. `cache: 'no-store'` on all fetches.

**Note:** always `git push origin dev` before merging to production. Push-only-merge-commit to `production` creates PushEvents with empty `commits` payload — that's why the Events API is not used.

### InfraStatusPanel

`src/components/InfraStatusPanel.tsx` + `src/hooks/useInfraStatus.ts`:
- Polls GET /status every 60s; header shows round-trip ms via `performance.now()`
- Deployed Commit row: SHA as blue link → GitHub commit URL, message truncated 1 line, relative date aligned right
- `timeAgo(dateStr)` helper inline
- Last Deploy shown in Footer (right side, relative time). Hidden when API unavailable.

### SettingsContext

`src/contexts/SettingsContext.tsx` — outermost provider:
- Reads `localStorage('portfolio_settings')` synchronously on mount → no flash
- Fetches GET /settings on mount → updates state + localStorage
- Listens `storage` events → cross-tab sync
- `updateSetting(key, value)` → PATCH /settings/{key} + state + localStorage
- `useSettings()` → `{ settings, updateSetting }`

### ContentContext

`src/contexts/ContentContext.tsx` — same pattern as SettingsContext:
- `localStorage('portfolio_content')` on mount → instant render
- GET /content on mount → update + localStorage
- `storage` events → cross-tab sync when admin saves
- `refreshContent()` — re-fetches from API; called after `putContent()` so live site updates immediately
- `useContent()` → `{ content: RawContent | null, refreshContent }`

### ContactSection

`src/components/ContactSection.tsx` — records `arrivedAt = useRef(Date.now())` on mount. Sends `timeOnSite`, `timezone`, `locale`, `referrer` on submit.

### Admin panel

`/admin` route (`src/components/admin/AdminPage.tsx`):
- Client-side password check (hardcoded `"admin"`) — placeholder auth
- Auth state in `sessionStorage` as `admin_token`
- Sidebar tabs: Analytics, Messages (unread badge), Resume, Content
- Active tab persisted to `localStorage('admin_tab')`

**AdminDashboard** — fetches `getContacts()` on mount for `unreadCount`; passes `onMarkRead` to `MessagesTab`.

**AnalyticsTab** — `getVisitorStats()` + `getContacts()` on mount. Cards: Total Visitors, Countries Reached, Messages. Horizontal bar chart for countries (only appear after CloudFront traffic via `cloudfront-viewer-country` header).

**MessagesTab** — inbox with unread indicator (cyan dot + bold). `table-fixed` + `<colgroup>` 44% message column → `line-clamp-2` preview. Click → mark-as-read → `MessageModal`. Modal: full message, metadata grid, Reply mailto. Pagination: 10/page with ellipsis.

**ResumeTab** — PDF drag-and-drop or picker (validates PDF + 5MB). Upload: `getResumeUploadUrl(lang)` → PUT S3 → `publishResume()`. Animated progress steps. Files land at `s3://<bucket>/resume/en/Alessandro_Bezerra_Java_Backend_Engineer.pdf`.

**ContentTab** — active section and lang persisted to `localStorage('admin_content_section')` / `localStorage('admin_content_lang')`. All editors fully live:

- **AvailabilityToggle** — reads `settings.openToWork`, calls `updateSetting('open_to_work', ...)`, shows "Saved ✓" for 2s
- **About editor** — paragraphs (one `AutoTextarea` per item, reorder ↑↓ + Trash2 in horizontal button row), skills (one per line textarea). Save → `putContent('about', lang, { paragraphs, skills })` → `refreshContent()`
- **Experience editor** — collapsible cards per item. Header: company + role + period. Expanded: all fields + highlights (repeatable inputs with ↑↓ Trash2) + stack. Save → `putContent('experience', lang, items)`
- **Projects editor** — Featured / Showcase sub-tabs (persisted to `localStorage('admin_projects_tab')`). Featured: title, description, stack, repoUrl, liveUrl, featured checkbox. Showcase: title, subtitle, year, description, stack, videoUrl (`VideoField` dropdown + upload), aspectRatio dropdown (`ASPECT_RATIOS = ['16 / 9', '4 / 3', '1 / 1', '9 / 16', '21 / 9']`), liveUrl, repoUrl, youtubeUrl. Save → `putContent('projects', lang, { items, showcaseItems })`
- **Certifications editor** — always-expanded cards in 2-column grid (name + issuer, year + credentialUrl). Reorder + delete. Save → `putContent('certifications', lang, items)`

`AutoTextarea` — wraps `react-textarea-autosize` with `useLayoutEffect` to reset `scrollTop = 0` after height change.

`VideoField` component — dropdown of existing S3 videos (from `getVideoList()`), Upload button (presigned PUT → `publishVideo()` invalidation), Trash2 delete button with `window.confirm`.
