import { Section } from './ui/Section'
import { Tag } from './ui/Tag'
import { useLang } from '../i18n'

export function ExperienceSection() {
  const { t } = useLang()
  const { experience } = t

  return (
    <Section id="experience" eyebrow={experience.eyebrow} title={experience.title}>
      <div className="space-y-10">
        {experience.items.map((item, i) => (
          <div
            key={i}
            className="relative grid gap-4 border-l border-zinc-200 pl-6 dark:border-zinc-800 sm:grid-cols-4"
          >
            {i === 0 && (
              <div className="absolute -left-px top-0 h-24 w-px bg-gradient-to-b from-accent-500/70 to-transparent" />
            )}

            <div className="sm:col-span-1">
              <p className="font-mono text-xs text-zinc-400">{item.period}</p>
              {item.location && (
                <p className="mt-1 text-xs text-zinc-400">{item.location}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <h3 className="text-lg">{item.role}</h3>
              <p className="mb-3 font-medium text-accent-600 dark:text-accent-400">
                {item.company}
              </p>
              <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
              <ul className="mb-4 space-y-1.5">
                {item.highlights.map((h, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-500" />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {item.stack.map((tech) => (
                  <Tag key={tech}>{tech}</Tag>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
