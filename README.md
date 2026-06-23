# Cloud Portfolio Platform

Personal portfolio built on AWS — React SPA on CloudFront + S3, fully serverless backend via API Gateway and Lambda, DynamoDB for persistence, SES for email. All infrastructure managed with Terraform.

**Live:** [portfolio.alessandro-bezerra.me](https://portfolio.alessandro-bezerra.me)

---

## Stack

**Frontend:** React 19 + TypeScript, Vite, Tailwind CSS v4, Framer Motion, EN/PT i18n

**Backend (Lambda / Node.js 20):** visitor counter, contact form, content CMS, resume upload, video showcase, infra status

**AWS:** S3, CloudFront (dual-origin: S3 + API GW), API Gateway HTTP API, Lambda, DynamoDB, SES, SSM, Route 53, ACM

---

## Structure

```
frontend/   # React SPA
backend/    # Lambda functions (one per route)
infra/      # Terraform (all resources)
```

---

## Running locally

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Without `VITE_API_BASE_URL` set, all API calls return safe fallbacks.

---

## Deploy

Push to `production` branch → GitHub Actions builds + syncs to S3 + invalidates CloudFront.

---

## Author

**Alessandro Bezerra** — Backend & Cloud Engineer

[GitHub](https://github.com/Narvaal) · [LinkedIn](https://www.linkedin.com/in/narvaal)
