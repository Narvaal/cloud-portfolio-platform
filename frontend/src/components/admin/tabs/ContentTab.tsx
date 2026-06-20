import { useState } from 'react'

type Section = 'projects' | 'experience' | 'about' | 'certifications'

const sections: { id: Section; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
]

function ComingSoonBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 py-16 dark:border-zinc-700">
      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">{label}</span>
      <p className="text-sm text-zinc-400">Editor coming soon — will connect to DynamoDB</p>
    </div>
  )
}

function AboutEditor() {
  const [paragraphs, setParagraphs] = useState([
    'Software Engineer with 3+ years of experience in backend development in the banking industry, building mission-critical systems that handle millions of daily transactions.',
    'Experienced in Java, Spring Framework, REST APIs, and Apache Tomcat — developing, maintaining, and evolving enterprise applications focused on reliability, performance, and maintainability.',
    'Hands-on with microservices, distributed systems, Clean Architecture, AWS, CI/CD, and production incident handling.',
  ])

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">Paragraphs (EN)</p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          read-only — no backend yet
        </span>
      </div>
      {paragraphs.map((p, i) => (
        <textarea
          key={i}
          value={p}
          onChange={(e) => {
            const next = [...paragraphs]
            next[i] = e.target.value
            setParagraphs(next)
          }}
          rows={3}
          disabled
          className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500"
        />
      ))}
      <button
        disabled
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Save Changes
      </button>
    </div>
  )
}

export function ContentTab() {
  const [active, setActive] = useState<Section>('about')

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Content</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Edit site content. Changes will update the live site instantly once connected to the API.
      </p>

      {/* Section tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              active === s.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {active === 'about' && <AboutEditor />}
      {active === 'experience' && <ComingSoonBlock label="Experience Editor" />}
      {active === 'projects' && <ComingSoonBlock label="Projects Editor" />}
      {active === 'certifications' && <ComingSoonBlock label="Certifications Editor" />}
    </div>
  )
}
