import type { Project } from '../types'

/** Replace with your real projects. Featured items render with emphasis. */
export const projects: Project[] = [
  {
    title: 'Cloud Portfolio Platform',
    description:
      'This very site: a cloud-native portfolio on AWS — React frontend on S3 + CloudFront, serverless contact form and visitor analytics via API Gateway, Lambda and DynamoDB, fully provisioned with Terraform.',
    stack: [
      'React',
      'TypeScript',
      'AWS',
      'Lambda',
      'DynamoDB',
      'Terraform',
      'CloudFront',
    ],
    repoUrl: 'https://github.com/Narvaal/cloud-portfolio-platform',
    liveUrl: '#',
    featured: true,
  },
  {
    title: 'Project Two',
    description:
      'A short, outcome-focused description of what this project does and the problem it solves.',
    stack: ['Java', 'Spring Boot', 'PostgreSQL'],
    repoUrl: 'https://github.com/Narvaal',
  },
  {
    title: 'Project Three',
    description:
      'Another project highlighting a different skill set or domain you want to showcase.',
    stack: ['TypeScript', 'Node.js', 'Docker'],
    repoUrl: 'https://github.com/Narvaal',
  },
]
