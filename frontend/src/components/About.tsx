import { Section } from './ui/Section'
import { Tag } from './ui/Tag'
import { useLang } from '../i18n'

export function About() {
  const { t } = useLang()
  const { about } = t

  return (
    <Section id="about" eyebrow={about.eyebrow} title={about.title}>
      <div className="grid gap-12 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {about.paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'text-lg leading-relaxed' : 'leading-relaxed'}>
              {p}
            </p>
          ))}
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-4 font-mono text-sm font-medium uppercase tracking-wider text-accent-500">
            {about.skillsLabel}
          </h3>
          <div className="flex flex-wrap gap-2">
            {about.skills.map((skill) => (
              <Tag key={skill} variant="skill">{skill}</Tag>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
