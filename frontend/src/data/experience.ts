import type { ExperienceItem } from '../types'

/** Replace with your real experience. Most recent first. */
export const experience: ExperienceItem[] = [
  {
    company: 'Company Name',
    role: 'Software Engineer',
    period: '2023 — Present',
    location: 'Remote',
    description:
      'Built and maintained backend services and cloud infrastructure for a high-traffic product.',
    highlights: [
      'Designed REST APIs serving millions of requests per month.',
      'Migrated workloads to serverless, cutting infra cost by ~40%.',
      'Introduced IaC with Terraform for reproducible environments.',
    ],
    stack: ['Java', 'Spring Boot', 'AWS', 'PostgreSQL', 'Terraform'],
  },
  {
    company: 'Previous Company',
    role: 'Backend Developer',
    period: '2021 — 2023',
    location: 'Hybrid',
    description:
      'Developed core domain services following Clean Architecture principles.',
    highlights: [
      'Owned the payments integration end to end.',
      'Added structured logging and metrics for observability.',
    ],
    stack: ['Java', 'Docker', 'DynamoDB', 'CI/CD'],
  },
]
