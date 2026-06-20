# Cloud Portfolio Platform

Production-grade, cloud-native portfolio built entirely on AWS. The frontend is a React + TypeScript SPA deployed on S3 and served globally via CloudFront. The backend is fully serverless: API Gateway routes requests to Lambda functions that handle contact form submissions and real-time visitor analytics, with data persisted in DynamoDB. All infrastructure is defined and provisioned as code with Terraform.

**Live:** [alessandro-bezerra.me](https://www.alessandro-bezerra.me)

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| i18n | Custom (EN / PT) |

### Infrastructure (AWS)
| Service | Role |
|---|---|
| S3 | Static file hosting |
| CloudFront | Global CDN + HTTPS |
| API Gateway | REST API entrypoint |
| Lambda | Serverless backend functions |
| DynamoDB | NoSQL persistence |
| SES | Contact form email delivery |
| Terraform | Infrastructure as Code |

---

## Project Structure

```
cloud-portfolio-platform/
├── frontend/                  # React SPA
│   ├── public/
│   │   ├── favicon/           # Logo and favicon
│   │   ├── resume/            # PDF resumes (EN + PT)
│   │   └── showcase/video/    # Project demo videos
│   └── src/
│       ├── components/        # UI components
│       │   └── ui/            # Reusable primitives (Tag, Section, Container, etc.)
│       ├── data/              # Static profile, experience, certifications data
│       ├── hooks/             # useTheme, useScrollSpy, useVisitorCount
│       ├── i18n/              # EN and PT translations
│       ├── services/          # API client
│       └── types/             # TypeScript interfaces
└── infra/                     # Terraform (coming soon)
```

---

## Features

- **Bilingual (EN / PT)** — full translations with a one-click language switcher
- **Dark mode** — system preference + manual toggle, persisted in localStorage
- **Hero with scramble effect** — greeting cycles through 6 languages with a slot-machine animation
- **Video showcase** — expandable project cards with inline video playback, GitHub/YouTube links, and live demo button
- **Independent showcase columns** — expanding one card never shifts the other column
- **Reusable Tag component** — with hover lift effect, used across all sections
- **Contact form** — sends email via API Gateway → Lambda → SES
- **Visitor counter** — real-time count fetched from DynamoDB via Lambda
- **Responsive** — mobile-first layout with Tailwind
- **Accessible** — semantic HTML, aria-labels, keyboard-navigable

---

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`. Without `VITE_API_BASE_URL` set, API calls (contact form, visitor count) simulate a local response.

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for the API Gateway (e.g. `https://api.alessandro-bezerra.me`) |

---

## Deployment

The frontend is deployed to S3 and invalidated via CloudFront on every push to `production`.

```bash
cd frontend
npm run build        # outputs to dist/
# CI/CD picks up dist/ and syncs to S3
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `dev` | Active development |
| `production` | Stable releases — what's live |

PRs go `dev → production`.

---

## Planned Features

- **Infrastructure Status panel** — real-time API/frontend health, last deploy time and version from SSM Parameter Store, updated automatically by CI/CD
- **Visitor analytics** — click-to-register with country detection via CloudFront-Viewer-Country header
- **GitHub Activity widget** — recent commits and repos, cached in DynamoDB via hourly EventBridge + Lambda sync

---

## Author

**Alessandro Bezerra da Silva** — Backend & Cloud Engineer

[GitHub](https://github.com/Narvaal) · [LinkedIn](https://www.linkedin.com/in/narvaal)
