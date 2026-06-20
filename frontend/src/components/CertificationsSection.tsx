import { Award, ExternalLink } from 'lucide-react'
import { Section } from './ui/Section'
import { useLang } from '../i18n'

export function CertificationsSection() {
  const { t } = useLang()
  const { certifications } = t

  return (
    <Section
      id="certifications"
      eyebrow={certifications.eyebrow}
      title={certifications.title}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {certifications.items.map((cert, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-500/10">
                <Award className="size-5 text-accent-500" />
              </span>
              <h3 className="text-base leading-snug">{cert.name}</h3>
            </div>

            <p className="mb-4 text-sm text-zinc-500">
              {cert.issuer}
              {cert.year && <span className="text-zinc-400"> - {cert.year}</span>}
            </p>

            {cert.credentialUrl && cert.credentialUrl !== '#' && (
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-auto flex items-center gap-1.5 text-xs text-accent-600 transition-colors hover:text-accent-500 dark:text-accent-400"
              >
                {certifications.verifyLabel}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}
