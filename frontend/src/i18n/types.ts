import type { NavItem, ExperienceItem, Project, VideoProject, Certification } from '../types'

export type Lang = 'en' | 'pt'

export interface Translations {
  hero: {
    role: string
    tagline: string
    viewWork: string
    downloadResume: string
    scroll: string
    resumeUrl: string
    location: string
    openToWork: string
  }
  about: {
    eyebrow: string
    title: string
    paragraphs: string[]
    skillsLabel: string
    skills: string[]
  }
  experience: {
    eyebrow: string
    title: string
    items: ExperienceItem[]
  }
  projects: {
    eyebrow: string
    title: string
    featuredLabel: string
    tryItLabel: string
    expandLabel: string
    collapseLabel: string
    items: Project[]
    showcaseLabel: string
    showcaseItems: VideoProject[]
  }
  certifications: {
    eyebrow: string
    title: string
    verifyLabel: string
    items: Certification[]
  }
  contact: {
    eyebrow: string
    title: string
    description: string
    availability: string
    nameLabel: string
    emailLabel: string
    messageLabel: string
    send: string
    sending: string
    success: string
    error: string
    errors: {
      nameTooLong: string
      emailInvalid: string
      messageTooLong: string
      missingFields: string
      rateLimit: string
    }
  }
  footer: {
    built: string
    visitorsLabel: string
  }
  github: {
    title: string
    commits: string
    repos: string
    noActivity: string
    starsLabel: string
  }
  infra: {
    title: string
    apiLabel: string
    frontendLabel: string
    lastDeployLabel: string
    versionLabel: string
    statusOnline: string
    statusOffline: string
    statusDegraded: string
    lastCommitLabel: string
    /** Formats a duration in minutes into a human-readable relative time string. */
    relativeTime: (mins: number) => string
  }
  nav: NavItem[]
  langSwitcher: {
    ariaLabel: string
  }
}
