# Cloud Portfolio Platform

## Project Overview

Cloud Portfolio Platform is a cloud-native personal portfolio designed to showcase software engineering skills while serving as a practical AWS learning project.

The project is inspired by the AWS Cloud Resume Challenge but extends it into a production-grade portfolio platform.

The goal is not only to display personal information and projects but also to demonstrate modern software engineering practices including:

* Frontend development
* Cloud architecture
* Serverless computing
* Infrastructure as Code
* Security
* Monitoring and Observability
* CI/CD
* Distributed systems concepts

This project should be treated as a real-world product rather than a simple personal website.

---

# Business Goals

The platform should:

1. Present professional experience.
2. Present projects and certifications.
3. Allow recruiters to download a resume.
4. Allow visitors to contact the owner.
5. Track visitor metrics.
6. Demonstrate cloud engineering skills.
7. Demonstrate backend engineering skills.
8. Demonstrate software architecture skills.

---

# Target Audience

* Recruiters
* Hiring Managers
* Software Engineers
* Technical Interviewers

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite

## Styling

* Tailwind CSS

## Cloud

* AWS

## Infrastructure

* Terraform

## CI/CD

* GitHub Actions

## Monitoring

* CloudWatch

---

# Architecture

Frontend:

React
↓
CloudFront
↓
S3

Backend:

API Gateway
↓
Lambda Functions
↓
DynamoDB

Email Flow:

React Contact Form
↓
API Gateway
↓
Lambda
↓
SES
↓
Personal Email

Visitor Counter:

Website
↓
API Gateway
↓
Lambda
↓
DynamoDB

---

# Project Phases

## Phase 1 - Frontend MVP

Objective:

Create a professional responsive portfolio.

Pages:

* Home
* About
* Experience
* Projects
* Certifications
* Contact

Requirements:

* Responsive design
* Mobile support
* Dark mode
* Resume download button

Deliverable:

Static website running locally.

---

## Phase 2 - AWS Static Hosting

Objective:

Deploy portfolio publicly.

Services:

* S3
* CloudFront

Requirements:

* HTTPS
* Public access
* Custom domain

Deliverable:

Portfolio accessible online.

---

## Phase 3 - Contact Form

Objective:

Allow visitors to contact the owner.

Services:

* API Gateway
* Lambda
* SES

Requirements:

* Form validation
* Spam prevention
* Error handling

Deliverable:

Working contact form sending emails.

---

## Phase 4 - Visitor Analytics

Objective:

Track visitors.

Services:

* API Gateway
* Lambda
* DynamoDB

Requirements:

Store:

* Total visits
* Daily visits

Display:

* Visitor counter

Deliverable:

Real visitor statistics.

---

## Phase 5 - Resume API

Objective:

Track resume downloads.

Services:

* API Gateway
* Lambda
* DynamoDB

Metrics:

* Total downloads
* Download history

Deliverable:

Download analytics.

---

## Phase 6 - Observability

Objective:

Monitor platform health.

Services:

* CloudWatch

Requirements:

* Structured logs
* Error tracking
* Metrics

Deliverable:

Operational dashboards.

---

## Phase 7 - Infrastructure as Code

Objective:

Provision everything automatically.

Tool:

Terraform

Requirements:

Terraform must create:

* S3
* CloudFront
* API Gateway
* Lambda
* DynamoDB
* SES configuration

Deliverable:

One-command deployment.

---

# Coding Standards

## Frontend

Use:

* Functional components
* Hooks
* TypeScript strict mode

Avoid:

* Class components
* Any type

---

## Backend

Use:

* Clean Architecture principles
* Dependency injection when appropriate
* Single Responsibility Principle

---

## Git Strategy

Branches:

main
develop
feature/*

Commits:

feat:
fix:
refactor:
docs:
chore:

Examples:

feat: add contact form
fix: handle lambda timeout
refactor: extract visitor service

---

# Folder Structure

cloud-portfolio-platform/

frontend/
src/
components/
pages/
services/
hooks/
types/

infrastructure/
terraform/

docs/

README.md

---

# Future Improvements

Possible future features:

* Blog
* Authentication
* Admin dashboard
* Visitor geographic analytics
* AI-powered chatbot
* Project recommendation engine

---

# Success Criteria

A successful project should allow a recruiter to immediately identify:

* Strong Java background
* AWS knowledge
* Backend engineering skills
* Software architecture knowledge
* Production mindset
* Ability to design and deliver complete systems
