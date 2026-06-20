/** Shared domain types for the portfolio content. */

export type SocialIcon = 'github' | 'linkedin' | 'mail'

export interface NavItem {
  /** Matches the `id` of the target <section> for anchor scrolling. */
  id: string
  label: string
}

export interface SocialLink {
  label: string
  href: string
  icon: SocialIcon
}

export interface Profile {
  name: string
  role: string
  tagline: string
  location: string
  email: string
  /** Public path or URL to the resume PDF. */
  resumeUrl: string
  socials: SocialLink[]
  skills: string[]
}

export interface ExperienceItem {
  company: string
  role: string
  /** Human-readable range, e.g. "2023 — Present". */
  period: string
  location?: string
  description: string
  highlights: string[]
  stack: string[]
}

export interface Project {
  title: string
  description: string
  stack: string[]
  repoUrl?: string
  liveUrl?: string
  /** Renders the card with emphasis when true. */
  featured?: boolean
}

export interface VideoProject {
  title: string
  subtitle?: string
  description: string
  year: string
  stack: string[]
  videoUrl: string
  aspectRatio?: string
  liveUrl?: string
  repoUrl?: string
  youtubeUrl?: string
}

export interface Certification {
  name: string
  issuer: string
  year?: string
  credentialUrl?: string
}
