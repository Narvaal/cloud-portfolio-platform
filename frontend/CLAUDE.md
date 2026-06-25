# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- last updated: 2026-06-25 -->

## Git Workflow

**Always commit to the `dev` branch.** Never commit directly to `production` or `main` without explicit human approval.

Branch structure:
- `dev` — active development, where all agent commits go
- `production` — stable, live branch; only receives changes after human explicitly approves
- `main` — mirrors `dev`

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
| API | API Gateway HTTP API + Lambda (Node.js 22) | **live** |
| IaC | Terraform (`infra/`) | **live** |
| Secrets / config | SSM Parameter Store | **live** |
| Database | DynamoDB | **live** |
| Email | SES | **live** |

Frontend connects via `VITE_API_BASE_URL`. When unset locally, all API calls return safe fallbacks.

### Environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | GitHub secret + local `.env.production` | `https://portfolio.alessandro-bezerra.me/api` — routes through CloudFront `/api/*` behavior |
| `VITE_GITHUB_TOKEN` | GitHub secret | Fine-grained read-only PAT — raises GitHub rate limit to 5000 req/h |
| `VITE_ADMIN_PASSWORD` | GitHub secret | Local dev fallback password only — production uses SSM-backed server-side auth |

### CI/CD — `.github/workflows/deploy-frontend.yml`

Triggers on push to `production` **only for `frontend/**` path changes** (or `workflow_dispatch`). Steps:
1. `actions/checkout@v4.2.2` with `fetch-depth: 0` — full history for `git log --no-merges`
2. `actions/setup-node@v4.4.0` with `node-version: '22'`
3. `npm ci` + `npm run build` (injects `VITE_*` secrets)
4. `aws-actions/configure-aws-credentials@v4.1.0`
5. `aws s3 sync dist/ s3://$S3_BUCKET/` — assets with long cache, `index.html` no-cache
6. `aws cloudfront create-invalidation` — purges CDN cache
7. `aws ssm put-parameter` — writes last real commit (non-merge) SHA/message/date to `/portfolio/*`

**Important:** CI/CD only deploys the frontend. Terraform/infra changes require manual `terraform apply` in `infra/`.

GitHub secrets required: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_BASE_URL`, `VITE_GITHUB_TOKEN`, `VITE_ADMIN_PASSWORD`.

### Terraform — `infra/`

```
infra/
  versions.tf          # provider AWS ~> 5.0
  variables.tf         # aws_region, project_name, environment, contact_email, domain_name
  main.tf              # S3, CloudFront (dual-origin + security headers policy), ACM wildcard cert,
                       # Route 53 A records, SSM params (including /portfolio/admin-secret), IAM
  lambda.tf            # Lambda exec role + all Lambda functions + IAM policies
  api_gateway.tf       # HTTP API, $default stage, "api" named stage (both throttled),
                       # all routes + Lambda permissions, POST /admin/auth route
  cloudfront_api.tf    # origin request policy
                       # (whitelist: CloudFront-Viewer-Country + Authorization)
  dynamodb.tf          # all DynamoDB tables (including rate_limit and admin_sessions)
  ses.tf               # SES domain identity + Lambda SES send IAM policy
  outputs.tf           # CloudFront URL, API GW URL, S3 bucket, IAM keys
```

Run order: `terraform init` → `terraform plan` → `terraform apply`.

Lambda hotfix without full CI/CD:
```bash
terraform apply -target=aws_lambda_function.<name>
```

Lambda resource names in `lambda.tf`: `status`, `contact`, `contacts_get`, `contacts_patch`, `settings`, `resume`, `video`, `content`, `admin_auth`, `visitors`.

Retrieve live resource IDs at any time:
```bash
terraform output
# cloudfront_distribution_id = "E3GN9C58SUEB3Q"
# s3_bucket_name             = "cloud-portfolio-frontend-356892335394"
# api_gateway_url            = "https://58l9thztmj.execute-api.us-east-1.amazonaws.com/"
```

SSM parameters:
- `/portfolio/version` — full git SHA of merge commit (written by CI)
- `/portfolio/last-deploy` — ISO 8601 timestamp (written by CI)
- `/portfolio/last-commit-sha` — 7-char SHA of last real commit (written by CI)
- `/portfolio/last-commit-message` — subject line of last real commit (written by CI)
- `/portfolio/last-commit-date` — ISO 8601 committer date (written by CI)
- `/portfolio/admin-secret` — **SecureString** — admin panel password. Set manually:
  ```bash
  aws ssm put-parameter --name /portfolio/admin-secret --value "<password>" --type SecureString --overwrite --region us-east-1
  ```
  Terraform creates it with `value = "changeme"` and `ignore_changes = [value]` — always set manually after first `terraform apply`.

### Custom domain — `portfolio.alessandro-bezerra.me`

Live URL: `https://portfolio.alessandro-bezerra.me`

Setup:
- ACM wildcard cert (`*.alessandro-bezerra.me` + SAN `alessandro-bezerra.me`) in `us-east-1`, DNS validated via Route 53
- CloudFront aliases currently `["portfolio.${domain_name}"]` only
- Route 53 A alias records: `portfolio.` → CloudFront; `www.` and `@` records exist in Route 53 but are NOT in CloudFront aliases yet (blocked by Squarespace's old CloudFront distribution owning those CNAMEs)
- **When Squarespace releases the aliases** — verify first:
  ```bash
  aws cloudfront list-conflicting-aliases --alias www.alessandro-bezerra.me --distribution-id E3GN9C58SUEB3Q
  ```
  When `Quantity` returns `0`, change `aliases` in `main.tf` to `["portfolio.${var.domain_name}", "www.${var.domain_name}", var.domain_name]` and run `terraform apply`

### CloudFront dual-origin architecture

CloudFront distribution has two origins:
1. **S3** (`S3-<bucket>`) — serves the React SPA (default behavior `*`)
2. **API Gateway** (`APIGW`) — serves the backend (`/api/*` ordered behavior)

**`/api/*` behavior**: `CachingDisabled` (AWS managed policy), `whitelist` origin request policy that forwards `CloudFront-Viewer-Country` and `Authorization` headers. CloudFront uses the origin domain as `Host` (not the viewer's `Host`) so API GW accepts the request. Query strings forwarded (`all`), no cookies.

**Authorization forwarding is critical** — without it, Bearer tokens sent by the admin frontend never reach Lambda. The whitelist policy (`cloudfront_api.tf`) explicitly includes `Authorization`.

**API GW `api` named stage**: all Lambda routes are accessible at `/<id>.execute-api.us-east-1.amazonaws.com/api/*`. This means a request to `portfolio.../api/visitors` hits CloudFront → APIGW origin → `api` stage → `/visitors` route — no URI rewriting needed. The `$default` stage also exists (referenced in `outputs.tf` for the invoke URL) but receives no CloudFront traffic.

**API Gateway throttling**: both `$default` and `api` stages have `throttling_burst_limit = 50`, `throttling_rate_limit = 20`.

**Country tracking**: `cloudfront-viewer-country` header forwarded to Lambda via `whitelist` origin request policy. Using `allViewerAndWhitelistCloudFront` instead would forward the viewer's `Host` header, causing API GW to return 403.

**SPA fallback**: custom error responses map 403 and 404 from S3 → 200 + `/index.html`. These only trigger for the S3 origin path, so API GW errors are not masked (they're a separate origin).

**CloudFront security headers policy** (`aws_cloudfront_response_headers_policy.security`) attached to the default (S3) cache behavior:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### SES and email

Contact email: `contact@alessandro-bezerra.me`

- `ses.tf` uses `aws_ses_domain_identity` (not `aws_ses_email_identity`) — covers all `@alessandro-bezerra.me` addresses
- Domain verified via `_amazonses.` TXT record in Route 53
- SES IAM policy allows `identity/alessandro-bezerra.me` ARN plus wildcard `identity/*@alessandrobezerra.me`
- **Email forwarding**: a separate Lambda (`redirectEmail`) in `us-east-2` receives SES receipt rule trigger. It strips the `Return-Path:` header (otherwise SES uses the Amazon bounce address as sender, which fails verification), sets `Source` to `contact@alessandro-bezerra.me`, and forwards to `alessandrobezerra100@gmail.com`. The `_amazonses.` TXT record has TWO values — one for `us-east-1` (sending) and one for `us-east-2` (receipt rules).

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

**`cloud-portfolio-rate-limit-prod`**
- PK: `pk` (String) — `"contact#<ip>"`
- `count` (Number), `ttl` (Number) — DynamoDB TTL enabled on `ttl`
- Used by `contact` Lambda: max 3 submissions per IP per hour

**`cloud-portfolio-admin-sessions-prod`**
- PK: `token` (String) — UUID v4
- `ttl` (Number) — DynamoDB TTL enabled on `ttl`; sessions expire after 8 hours
- Written by `admin-auth` Lambda on successful login; read by `auth.mjs` shared module

### Backend — `backend/functions/`

```
_shared/auth.mjs         # Shared: isAuthorized(event) — reads Bearer token from Authorization header,
                         # validates against admin_sessions DynamoDB table. UNAUTHORIZED constant.
                         # Bundled into: contacts, contacts-patch, settings, resume, video, content zips.

admin-auth/index.mjs     # POST /admin/auth — reads password from body, validates against
                         # SSM /portfolio/admin-secret (SecureString, cached 5min in Lambda memory),
                         # creates UUID session in admin_sessions table with 8h TTL → { token }.
                         # 500ms artificial delay on wrong password.

status/index.mjs         # GET /status — 5 SSM params → { api, frontend, version, lastDeploy, lastCommit }
visitors/index.mjs       # GET /visitors — Scan → { count, countries[] }
                         # POST /visitors — atomically increments TOTAL + COUNTRY#xx → { count }
contact/index.mjs        # POST /contact — validates input (name ≤100, email format, message ≤2000),
                         # rate-limits by IP (3/hr via rate_limit table), sends SES email,
                         # PutItem to contacts table
contacts/index.mjs       # GET /contacts — auth required — Scan, sort by id desc → { items }
contacts-patch/index.mjs # PATCH /contacts/{id} — auth required — UpdateItem sets read=true
settings/index.mjs       # GET /settings → { key: value } map (public)
                         # PATCH /settings/{key} — auth required — UpdateItem sets value
resume/index.mjs         # All operations auth required
                         # GET /resume/presign?lang=en|pt → presigned S3 PutObject URL (5 min)
                         # POST /resume/publish → CloudFront invalidation for /resume/*
                         # CloudFront client must use region: 'us-east-1' explicitly
content/index.mjs        # GET /content → { [type]: { [lang]: parsedData } } (public)
                         # PUT /content/{type}?lang=en|pt — auth required — PutItemCommand with JSON-encoded data
video/index.mjs          # All operations auth required
                         # GET /video/list → { files: string[] } — .mp4 filenames in showcase/video/
                         # GET /video/presign?filename=x.mp4 → presigned S3 PutObject URL (5 min)
                         # POST /video/publish → CloudFront invalidation for /showcase/video/*
                         # DELETE /video/{filename} → DeleteObject from S3
```

### Live API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/auth` | — | Password → session token (8h) |
| GET | `/status` | — | SSM params → health + lastDeploy + lastCommit |
| GET | `/visitors` | — | `{ count, countries }` |
| POST | `/visitors` | — | increments counter → `{ count }` |
| POST | `/contact` | — | validates + rate-limits + SES email + DynamoDB |
| GET | `/contacts` | Bearer | all submissions newest-first, includes `read` |
| PATCH | `/contacts/{id}` | Bearer | marks message as read |
| GET | `/settings` | — | `{ open_to_work: "true"\|"false", ... }` |
| PATCH | `/settings/{key}` | Bearer | updates single setting |
| GET | `/resume/presign` | Bearer | `?lang=en\|pt` → `{ uploadUrl }` |
| POST | `/resume/publish` | Bearer | CloudFront invalidation for `/resume/*` |
| GET | `/content` | — | `{ [type]: { [lang]: data } }` |
| PUT | `/content/{type}` | Bearer | `?lang=en\|pt` — replaces full payload |
| GET | `/video/list` | Bearer | `{ files: string[] }` — mp4 filenames |
| GET | `/video/presign` | Bearer | `?filename=x.mp4` → `{ uploadUrl }` |
| POST | `/video/publish` | Bearer | CloudFront invalidation for `/showcase/video/*` |
| DELETE | `/video/{filename}` | Bearer | deletes mp4 from S3 |

### Lambda IAM permissions

Single `lambda_exec` role:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `ssm:GetParameters` on `/portfolio/*`
- `ssm:GetParameter` on `/portfolio/admin-secret` (for admin-auth Lambda)
- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Scan` on visitors table
- `dynamodb:PutItem`, `dynamodb:Scan`, `dynamodb:UpdateItem` on contacts table
- `dynamodb:Scan`, `dynamodb:UpdateItem`, `dynamodb:GetItem` on settings table
- `dynamodb:Scan`, `dynamodb:PutItem` on content table
- `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem` on rate_limit table
- `dynamodb:GetItem`, `dynamodb:PutItem` on admin_sessions table
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

Thin fetch wrapper. When `VITE_API_BASE_URL` unset, all calls return safe fallbacks (or local-dev password check for `loginAdmin`).

Auth helpers (internal):
- `getAdminToken()` — reads `admin_token` from `sessionStorage`
- `adminHeaders()` — returns `{ Authorization: 'Bearer <token>' }` or `{}`

Exported functions:
- `loginAdmin(password)` — POST /admin/auth → `{ token }`. If `VITE_API_BASE_URL` unset, falls back to comparing against `VITE_ADMIN_PASSWORD` (local dev only)
- `getInfraStatus()` — GET /status
- `fetchVisitorCount()` — POST /visitors (increments on page load)
- `getVisitorStats()` — GET /visitors → `VisitorStats { count, countries }`
- `sendContactMessage(payload)` — POST /contact; throws `Error(apiErrorMessage)` on failure so caller can show translated field-level errors
- `getContacts()` — GET /contacts (Bearer) → `ContactMessage[]`
- `patchContact(id)` — PATCH /contacts/{id} (Bearer)
- `getSettings()` — GET /settings → `Record<string, string>`
- `patchSetting(key, value)` — PATCH /settings/{key} (Bearer)
- `getResumeUploadUrl(lang)` — GET /resume/presign (Bearer)
- `publishResume()` — POST /resume/publish (Bearer)
- `getContent()` — GET /content → `RawContent | null`
- `putContent(type, lang, data)` — PUT /content/{type} (Bearer)
- `getVideoList()` — GET /video/list (Bearer) → `string[]`
- `getVideoUploadUrl(filename)` — GET /video/presign (Bearer)
- `publishVideo()` — POST /video/publish (Bearer)
- `deleteVideo(filename)` — DELETE /video/{filename} (Bearer)

### Theming

Dark mode via CSS class (`dark` on `<html>`). Tailwind v4 with `@custom-variant dark` in `src/index.css`. Accent color (`accent-*`) = cyan/AWS palette. `useTheme` syncs state with DOM class and `localStorage`.

**Critical:** background color on `body`, not `html` — setting it on `html` hides fixed elements with negative `z-index`.

### Section layout pattern

`<Section id="..." eyebrow="..." title="...">` from `src/components/ui/Section.tsx` — wraps in `<Container>` + Framer Motion scroll-reveal (`whileInView`, `once: true`). Nav anchors match `id` props.

**Anchor placement:** the `id` is on a `<div id={id} className="relative -top-6" />` placed inside the `<Container>`, immediately before the `motion.div` content — NOT on the `<section>` element itself. This ensures the scroll destination lands at the heading (not at the section's `py-20/py-28` top padding). The `-top-6` (−24px) gives breathing room equal to `Container`'s `px-6` horizontal padding.

Section components must **not** have `scroll-mt-*` — `scroll-padding-top: 4rem` on `html` handles the offset.

### Scroll spy

`useScrollSpy` returns `[activeId, notifyNavClick]`. Listens to `scroll`, compares `absoluteTop` against `scrollY + 250`. Last section forced active at bottom. **Do not use IntersectionObserver.**

`notifyNavClick(id)` must be called from every nav click handler — sets active immediately and suppresses spy for 1200ms.

**Mobile menu nav items use `<button type="button">`** (not `<a href>`). iOS Safari can fire hash navigation before `e.preventDefault()` takes effect, scrolling the page to the wrong position. The mobile menu buttons call `setOpen(false)` then `setTimeout(400ms)` → `window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' })`. Desktop nav links still use `<a href="#id">` with CSS `scroll-padding-top`.

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

### Mobile layout

Patterns established for responsive behavior:

- **Text justification** (`src/index.css`): `@media (max-width: 639px)` applies `text-align: justify; hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word` to all `p` elements. `hyphens: auto` prevents word-spacing rivers.
- **Showcase grid** (`ProjectsSection.tsx`): uses `flex flex-col sm:flex-row` — single column on mobile, two columns on `sm+`.
- **Video thumbnail** (`VideoProjectCard.tsx`): `onLoadedMetadata` handler seeks to `currentTime = 0.001` to force first-frame decode on mobile. Container has `bg-zinc-100 dark:bg-zinc-800` as fallback while loading.
- **Hero scroll indicator** (`Hero.tsx`): section uses `pb-28 sm:pb-16` so the absolute-positioned scroll arrow doesn't overlap the stacked InfraStatusPanel on mobile.
- **Hero CTA buttons** (`Hero.tsx`): container is `flex items-center gap-2 sm:gap-4` (no wrap). Each button has `flex-1 whitespace-nowrap sm:flex-none` — fills the row equally on mobile, auto-size on desktop.
- **Button `lg` size** (`src/components/ui/Button.tsx`): responsive — `px-4 py-2 text-sm` on mobile, `sm:px-6 sm:py-3 sm:text-base` on desktop.
- **Footer top row** (`Footer.tsx`): always `flex flex-row items-center justify-between` — name + links always on one line.
- **Contact submit button** (`ContactSection.tsx`): `w-full justify-center` — full width matching the message textarea.
- **Admin dashboard** (`AdminDashboard.tsx`): desktop keeps fixed sidebar (`hidden md:flex w-56`). Mobile shows a top bar with hamburger button → slide-in drawer overlay (`fixed inset-y-0 left-0 z-50`, `translate-x-0` / `-translate-x-full`). Closing the drawer: tap nav item or tap the dark overlay (`bg-black/40`).

### ContactSection

`src/components/ContactSection.tsx`:
- Records `arrivedAt = useRef(Date.now())` on mount. Sends `timeOnSite`, `timezone`, `locale`, `referrer` on submit.
- Field-level error display: on API error, the raw message is classified by keyword (`name` / `email` / `message` / `missing` / `too many`) and mapped to a translated string from `t.contact.errors.*`. The affected field gets a red border (`inputErrorClass`) and an inline error below it. General errors (rate limit, unknown) appear as a banner above the submit button.
- Error for a field clears as the user starts typing in that field.
- Translated error keys in `t.contact.errors`: `nameTooLong`, `emailInvalid`, `messageTooLong`, `missingFields`, `rateLimit`.

### Admin panel

`/admin` route (`src/components/admin/AdminPage.tsx`):
- Auth state in `sessionStorage` as `admin_token`
- Login calls `loginAdmin(password)` → POST /admin/auth → stores returned token
- **Local dev** (no `VITE_API_BASE_URL`): falls back to comparing against `VITE_ADMIN_PASSWORD`
- **Production**: token issued by `admin-auth` Lambda after validating against SSM `/portfolio/admin-secret` (SecureString)
- Session lasts 8 hours (DynamoDB TTL on `admin_sessions` table)
- Active tab persisted to `localStorage('admin_tab')`

**AdminLogin** (`src/components/admin/AdminLogin.tsx`):
- Eye/EyeOff toggle to show/hide password (lucide-react icons)
- Calls `loginAdmin()` from `api.ts` — no client-side password comparison in production

**AdminDashboard** (`src/components/admin/AdminDashboard.tsx`):
- Fetches `getContacts()` on mount for `unreadCount`; passes `onMarkRead` to `MessagesTab`
- Sidebar tabs: Analytics, Messages (unread badge), Resume, Content, Config
- "Back to Portfolio" link (`<a href="/">`) and "Sign out" button in sidebar footer
- Mobile: slide-in drawer + top bar (see Mobile layout section above)

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

### Security hardening (implemented)

All admin-mutating endpoints are protected by Bearer token auth via `_shared/auth.mjs`. The shared module is bundled into each protected Lambda's zip at Terraform deploy time.

- **Rate limiting** — `contact` Lambda: 3 requests/hour per IP using DynamoDB `rate_limit` table with TTL. Count is atomically incremented; first write sets a 1-hour TTL.
- **Input validation** — `contact` Lambda: name ≤ 100 chars, email regex + ≤ 254 chars, message ≤ 2000 chars. Returns specific error messages that the frontend maps to field-level display.
- **Server-side admin auth** — `admin-auth` Lambda: password from SSM SecureString (cached 5min in Lambda memory), UUID session token written to DynamoDB with 8h TTL. 500ms artificial delay on wrong password.
- **API Gateway throttling** — burst 50, rate 20 req/s on both stages.
- **CloudFront security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, XSS Protection, Referrer-Policy on all responses from the S3 origin.
- **Authorization header forwarding** — explicitly whitelisted in the CloudFront origin request policy so Bearer tokens reach Lambda through the CDN layer.
