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
| Database | DynamoDB | **live** (visitors + contacts + settings tables) |
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
  dynamodb.tf          # visitors + contacts + settings tables
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
- `GET /visitors` scans all items to return `{ count, countries: [{code, count}] }`

**`cloud-portfolio-contacts-prod`**
- PK: `id` (String) — `"${Date.now()}-${randomSuffix}"` (sorts newest-first lexicographically)
- Attributes: `name`, `email`, `message`, `referrer`, `device`, `timezone`, `locale`, `timeOnSite` (Number, seconds), `country`, `ip`, `receivedAt` (ISO 8601), `read` (Boolean)
- `read` is absent on older items — treated as unread wherever `!m.read`

**`cloud-portfolio-settings-prod`**
- PK: `key` (String)
- Attribute: `value` (String)
- Current keys: `open_to_work` (`"true"` / `"false"`)
- Planned keys: `about_en`, `about_pt` (for Phase 2b About editor via settings approach — or may move to content table)

### Backend — `backend/functions/`

```
backend/functions/
  status/
    index.mjs          # GET /status — reads 4 SSM params → { api, frontend, version, lastDeploy, lastCommit }
  visitors/
    index.mjs          # GET /visitors — Scan table → { count, countries: [{code,count}] sorted desc }
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
    index.mjs          # GET /resume/presign?lang=en|pt — getSignedUrl for S3 PutObject (5 min, Content-Type: application/pdf)
                       # POST /resume/publish — CloudFront CreateInvalidation for /resume/*
                       # CloudFront client must use region: 'us-east-1' explicitly
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
| GET | `/settings` | settings | `{ open_to_work: "true"|"false", ... }` map |
| PATCH | `/settings/{key}` | settings | updates single setting value |
| GET | `/resume/presign` | resume | `?lang=en|pt` → `{ uploadUrl }` |
| POST | `/resume/publish` | resume | CloudFront invalidation for `/resume/*` |

### Lambda IAM permissions

Single `lambda_exec` role shared by all functions:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `ssm:GetParameters` on `arn:aws:ssm:*:*:parameter/portfolio/*`
- `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Scan` on visitors table
- `dynamodb:PutItem`, `dynamodb:Scan`, `dynamodb:UpdateItem` on contacts table
- `dynamodb:Scan`, `dynamodb:UpdateItem` on settings table
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

`main.tsx` → `App.tsx` sets up `BrowserRouter` + `SettingsProvider` + `LangProvider`, then routes:
- `/` → `Portfolio` (the public-facing page)
- `/admin/*` → `AdminPage` (protected dashboard)

`Portfolio.tsx` composes sections: `Navbar → Hero → About → ExperienceSection → ProjectsSection → CertificationsSection → ContactSection → Footer`.

### Internationalisation (i18n)

All user-visible text lives in `src/i18n/en.ts` and `src/i18n/pt.ts`. The `Translations` interface in `src/i18n/types.ts` is the single source of truth. Components consume via `useLang()` from `src/i18n/index.tsx` (`{ lang, t, setLang }`). Language persisted to `localStorage`.

**Content arrays** (`projects.items`, `showcaseItems`, `experience.items`, `certifications.items`) are part of the translation objects, not separate files. `src/data/projects.ts`, `src/data/experience.ts`, `src/data/certifications.ts` exist as fallbacks but the live content comes from `en.ts`/`pt.ts`.

**Typed content shapes** are in `src/types/index.ts`:
- `ExperienceItem` — company, role, period, location?, description, highlights[], stack[]
- `Project` — title, description, stack[], repoUrl?, liveUrl?, featured?
- `VideoProject` — title, subtitle?, description, year, stack[], videoUrl, aspectRatio?, liveUrl?, repoUrl?, youtubeUrl?
- `Certification` — name, issuer, year?, credentialUrl?

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

`public/showcase/video/` — all three MP4 files are encoded with `-movflags faststart` (moov atom at byte ~32, immediately after ftyp). This is critical for CloudFront to serve range requests correctly. If replacing a video, always run:
```bash
ffmpeg -i input.mp4 -c copy -movflags faststart output.mp4
```

### Backend / API

`src/services/api.ts` is a thin fetch wrapper. When `VITE_API_BASE_URL` is unset, all calls return safe fallbacks.

Exported interfaces: `InfraStatus`, `ContactPayload`, `ContactMessage`, `VisitorStats`.

Exported functions:
- `getInfraStatus()` — GET /status (used by `useInfraStatus`, polls every 60s)
- `fetchVisitorCount()` — POST /visitors (increments on page load, called once from `useVisitorCount`)
- `getVisitorStats()` — GET /visitors, returns `VisitorStats { count, countries }` (admin)
- `getVisitorCount()` — wrapper around `getVisitorStats()` returning only the count
- `sendContactMessage(payload)` — POST /contact
- `getContacts()` — GET /contacts, returns `ContactMessage[]` sorted newest-first
- `patchContact(id)` — PATCH /contacts/{id}, marks as read
- `getSettings()` — GET /settings, returns `Record<string, string>`
- `patchSetting(key, value)` — PATCH /settings/{key}
- `getResumeUploadUrl(lang)` — GET /resume/presign?lang=en|pt → `{ uploadUrl }`
- `publishResume()` — POST /resume/publish (CloudFront invalidation)

### GitHub activity

`useGithubActivity` fetches from GitHub API directly in the browser, cached in `localStorage` for 1h (`github_activity_cache`). `SKIP_REPOS` filters unwanted repos. Includes `Authorization: Bearer $VITE_GITHUB_TOKEN` when set (5000 req/h vs 60).

### InfraStatusPanel

`src/components/InfraStatusPanel.tsx` + `src/hooks/useInfraStatus.ts`:
- Polls GET /status every 60s; header shows round-trip ms via `performance.now()`
- Shows API status, Frontend status, Last Commit (SHA inline + message `line-clamp-2`)
- **Last Deploy is in the Footer** (right side, relative time). Hidden when API unavailable.

### SettingsContext

`src/contexts/SettingsContext.tsx` — wraps the entire app (outside `LangProvider`):
- Reads `localStorage('portfolio_settings')` synchronously on mount → instant render (no flash)
- Fetches `GET /settings` on mount → updates state + writes back to `localStorage`
- Listens for `storage` events → syncs across open tabs in real time
- `updateSetting(key, value)` — calls `PATCH /settings/{key}` + updates state + writes `localStorage`
- `useSettings()` exposes `{ settings, updateSetting }`

Currently managed settings: `openToWork: boolean`.

**How `open_to_work` flows:** `ContentTab` toggle → `updateSetting('open_to_work', 'true'|'false')` → DynamoDB PATCH → localStorage → `Hero.tsx` via `useSettings()` re-renders immediately in all open tabs.

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
- Files land at `s3://<bucket>/resume/en/Alessandro_Bezerra_Java_Backend_Engineer.pdf` (hardcoded filename in Lambda)

**ContentTab** (`src/components/admin/tabs/ContentTab.tsx`) — partially live:
- `AvailabilityToggle` — fully wired; reads `settings.openToWork`, calls `updateSetting('open_to_work', ...)`, shows "Saved ✓" for 2s
- Section tabs: About / Experience / Projects / Certifications — all show `<ComingSoonBlock>` placeholder

---

## Roadmap — Phase 2b · Content CMS

**Goal:** edit About, Experience, Projects, and Certifications from the admin without a code rebuild. Changes take effect immediately on the live site without a CI/CD deploy.

### Architecture overview

A new DynamoDB table (`cloud-portfolio-content-prod`) stores content as JSON blobs, keyed by `type + lang`. A single Lambda handles read (Scan) and write (PutItem). On the frontend, a new `ContentProvider` fetches all content on app load and merges it into the `LangProvider`'s translation objects — all existing content-rendering components remain unchanged.

```
Admin PUT /content/{type}?lang=en
       ↓
DynamoDB cloud-portfolio-content-prod
  { pk: "experience", sk: "en", data: "[{…}]" }
       ↓ (on next page load)
GET /content → ContentProvider → merged into t.experience.items
       ↓
ExperienceSection reads t.experience.items (unchanged)
```

---

### Step 1 — Terraform: content table + Lambda + routes

**`infra/dynamodb.tf`** — add:
```hcl
resource "aws_dynamodb_table" "content" {
  name         = "${var.project_name}-content-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "type"
  range_key    = "lang"

  attribute { name = "type"; type = "S" }
  attribute { name = "lang";  type = "S" }

  tags = local.tags
}
```

**`infra/lambda.tf`** — add IAM policy + archive + Lambda resource for `content`:
```hcl
resource "aws_iam_role_policy" "lambda_content" {
  name = "${var.project_name}-lambda-content-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Scan", "dynamodb:PutItem"]
      Resource = aws_dynamodb_table.content.arn
    }]
  })
}
```

Lambda env var: `CONTENT_TABLE = aws_dynamodb_table.content.name`

**`infra/api_gateway.tf`** — add routes:
```
GET  /content          → content Lambda
PUT  /content/{type}   → content Lambda  (?lang= query param)
```

Also add `PUT` to the API Gateway CORS `allow_methods`.

---

### Step 2 — Backend: `backend/functions/content/index.mjs`

```javascript
// GET /content
// → Scan entire table → { experience: { en: [...], pt: [...] }, projects: {...}, ... }
// Each item: { type, lang, data } where data is a JSON string

// PUT /content/{type}?lang=en
// → PutItemCommand with { type: {S}, lang: {S}, data: {S: JSON.stringify(items)} }
// Replaces the full array for that type+lang combination
```

CORS must include `PUT` in `Access-Control-Allow-Methods`.

`pathParameters.type` from API Gateway payload 2.0. `queryStringParameters.lang` for the language.

---

### Step 3 — Frontend: `api.ts` additions

```typescript
export interface ContentMap {
  about?: { paragraphs: string[]; skills?: string[] }
  experience?: ExperienceItem[]
  projects?: { items: Project[]; showcaseItems: VideoProject[] }
  certifications?: Certification[]
}

export interface AllContent {
  en: ContentMap
  pt: ContentMap
}

/** Fetches all content types for both languages in one call. */
export async function getContent(): Promise<AllContent | null>

/** Admin — replaces one content type+lang. data shape must match ContentMap[type]. */
export async function putContent(type: string, lang: 'en' | 'pt', data: unknown): Promise<void>
```

---

### Step 4 — Frontend: `ContentProvider`

New file `src/contexts/ContentContext.tsx`:

```typescript
// On mount: fetch GET /content
// Provides: content: AllContent | null
// Falls back to null if API unavailable (LangProvider uses i18n static data)
// writeToStorage / readFromStorage similar to SettingsContext for instant render on reload
```

Wrap in `App.tsx` between `SettingsProvider` and `LangProvider`:
```tsx
<SettingsProvider>
  <ContentProvider>
    <LangProvider>
      {children}
    </LangProvider>
  </ContentProvider>
</SettingsProvider>
```

---

### Step 5 — Frontend: merge into `LangProvider`

In `src/i18n/index.tsx`, `LangProvider` imports `useContent()` and wraps the provided `t` with a `useMemo`:

```typescript
const { content } = useContent()

const t = useMemo(() => {
  const base = lang === 'en' ? en : pt
  if (!content) return base
  const c = content[lang]
  return {
    ...base,
    about: {
      ...base.about,
      paragraphs: c?.about?.paragraphs ?? base.about.paragraphs,
      skills:     c?.about?.skills     ?? base.about.skills,
    },
    experience: {
      ...base.experience,
      items: c?.experience ?? base.experience.items,
    },
    projects: {
      ...base.projects,
      items:         c?.projects?.items         ?? base.projects.items,
      showcaseItems: c?.projects?.showcaseItems ?? base.projects.showcaseItems,
    },
    certifications: {
      ...base.certifications,
      items: c?.certifications ?? base.certifications.items,
    },
  }
}, [lang, content])
```

No change needed in any section component.

---

### Step 6 — Admin: `ContentTab` — About editor

The About section is the simplest editor. Stored in the content table as `{ type: "about", lang: "en" }` with `data: JSON.stringify({ paragraphs: string[], skills: string[] })`.

**UI:**
- Language switcher at the top of ContentTab (EN / PT), shared across all sub-editors
- **Paragraphs**: list of `<textarea>` fields (one per paragraph), "Add paragraph" / "Remove" buttons
- **Skills** (EN only): comma-separated tag input or a textarea, split on save
- "Save" button — calls `putContent('about', lang, { paragraphs, skills })` → shows "Saved ✓" 2s

Initial state: load from `useContent()` result, fall back to `t.about.paragraphs` / `t.about.skills`.

---

### Step 7 — Admin: `ContentTab` — Experience editor

Each `ExperienceItem`: company, role, period, location?, description, highlights[], stack[].

**UI:**
- List of collapsible cards (one per experience item), ordered by position
- Collapsed view: company + role + period
- Expanded view: full edit form
  - Text inputs: company, role, period, location
  - Textarea: description
  - Repeatable list: highlights (one `<input>` per bullet, add/remove buttons)
  - Tag input: stack (comma-separated, rendered as chips)
- Add new experience button at the bottom
- Delete button per card (with confirmation)
- Up/down arrows to reorder (or drag-and-drop later)
- "Save All" button saves the entire array: `putContent('experience', lang, items)`

**Language note:** company/role/period/stack are typically the same across EN/PT. Switching language swaps the description and highlights. The full object is stored separately per lang — no sharing between EN and PT.

---

### Step 8 — Admin: `ContentTab` — Certifications editor

The simplest full editor. Each `Certification`: name, issuer, year?, credentialUrl?.

**UI:**
- Simple card list with inline edit (or small modal)
- Fields: name (input), issuer (input), year (input, optional), credentialUrl (input, optional)
- Add / delete per item
- Reorder with up/down arrows
- "Save All" button: `putContent('certifications', lang, items)`

Language note: certifications are EN-only in practice (same names across languages). The lang switcher still calls `putContent` with the active lang for consistency; PT falls back to EN if absent.

---

### Step 9 — Admin: `ContentTab` — Projects editor

Most complex editor — two sub-sections: **Featured** (`items: Project[]`) and **Showcase** (`showcaseItems: VideoProject[]`). Both are stored under `type: "projects"`.

**Sub-tab switcher:** "Featured" | "Showcase" within the Projects section.

**Featured projects editor** (Project[]):
- Card list, each card: title, description (textarea), stack (tag input), repoUrl (input, optional), liveUrl (input, optional), featured (checkbox)
- Add / delete / reorder

**Showcase projects editor** (VideoProject[]):
- Card list, each card:
  - title, subtitle (input, optional)
  - year (input, e.g. `"Apr 2026"`)
  - description (textarea — long, multi-paragraph)
  - stack (tag input)
  - videoUrl (input — path under `/showcase/video/`, e.g. `/showcase/video/RareLines.mp4`)
  - aspectRatio (input, optional, default `"16 / 9"`)
  - liveUrl, repoUrl, youtubeUrl (inputs, optional)
- Add / delete / reorder

**Save All** calls `putContent('projects', lang, { items, showcaseItems })`.

**Note on video files:** videoUrl stores the path to files in `public/showcase/video/`. Adding a new video requires uploading the MP4 file to S3 separately (the Resume upload flow can be adapted for this later). The editor only manages metadata, not the video file itself.

---

### Implementation order

1. **Terraform** — content table + Lambda + routes + IAM (`dynamodb:Scan`, `dynamodb:PutItem`)
2. **Backend** — `backend/functions/content/index.mjs` (GET Scan + PUT PutItem)
3. **`api.ts`** — `getContent()` + `putContent()` + `AllContent`/`ContentMap` interfaces
4. **`ContentContext.tsx`** — provider with localStorage cache + `storage` event sync
5. **`LangProvider` merge** — `useMemo` to override i18n arrays with dynamic content
6. **About editor** — simplest; validates the full data layer end-to-end
7. **Certifications editor** — simple list CRUD
8. **Experience editor** — more complex (highlights list, reorder)
9. **Projects editor** — most complex (two sub-sections, long descriptions)

After step 6 (About editor working), the pattern is established — steps 7–9 repeat the same backend call and content-merge flow with different shapes.

**Seeding:** no explicit seed step needed. On first save from the admin, DynamoDB is populated. Until then, the site reads from static `en.ts`/`pt.ts`. The admin editors initialize from `useContent()` with fallback to `t.*` so the current content is always pre-filled.
