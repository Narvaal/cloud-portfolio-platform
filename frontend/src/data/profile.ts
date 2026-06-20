import type { SocialIcon } from '../types'

/** Static, non-translatable profile data. Translatable content lives in src/i18n/. */
export const profile = {
  name: 'Alessandro Bezerra da Silva',
  email: 'contact@alessandro-bezerra.me',
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/Narvaal',
      icon: 'github' as SocialIcon,
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/narvaal',
      icon: 'linkedin' as SocialIcon,
    },
    {
      label: 'Email',
      href: 'mailto:contact@alessandro-bezerra.me',
      icon: 'mail' as SocialIcon,
    },
  ],
}
