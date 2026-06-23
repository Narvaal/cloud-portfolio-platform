import { ExternalLink } from 'lucide-react'
import { GitHubIcon } from './ui/BrandIcons'
import { Section } from './ui/Section'
import { Tag } from './ui/Tag'
import { VideoProjectCard } from './VideoProjectCard'
import { useLang } from '../i18n'

export function ProjectsSection() {
  const { t } = useLang()
  const { projects } = t

  return (
    <Section id="projects" eyebrow={projects.eyebrow} title={projects.title}>
      {/* Regular project cards */}
      <div className={`grid gap-6 ${projects.items.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {projects.items.map((project, i) => (
          <div
            key={i}
            className={`flex flex-col rounded-xl border p-6 transition-shadow hover:shadow-md ${
              project.featured
                ? 'border-accent-500/40 bg-accent-500/5 dark:border-accent-400/30 dark:bg-accent-500/5'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50'
            }`}
          >
            {project.featured && (
              <span className="mb-4 inline-flex w-fit rounded-full bg-accent-500/10 px-2.5 py-1 font-mono text-xs text-accent-600 dark:text-accent-400">
                {projects.featuredLabel}
              </span>
            )}

            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-lg">{project.title}</h3>
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub repository"
                  className="text-zinc-400 transition-colors hover:text-accent-500"
                >
                  <GitHubIcon className="size-4" />
                </a>
              )}
            </div>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {project.description}
            </p>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
                <Tag key={tech}>{tech}</Tag>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {project.liveUrl && project.liveUrl !== '#' && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Live demo"
                  className="text-zinc-400 transition-colors hover:text-accent-500"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Showcase divider */}
      <div className="my-12 flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
        <span className="font-mono text-xs font-medium uppercase tracking-widest text-zinc-400">
          {projects.showcaseLabel}
        </span>
        <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
      </div>

      {/* Video showcase cards — two independent flex columns so expanding one never shifts the other */}
      <div className="flex gap-6">
        <div className="flex flex-1 flex-col gap-6">
          {projects.showcaseItems.filter((_, i) => i % 2 === 0).map((project, i) => (
            <VideoProjectCard
              key={i * 2}
              project={project}
              tryItLabel={projects.tryItLabel}
              expandLabel={projects.expandLabel}
              collapseLabel={projects.collapseLabel}
            />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-6">
          {projects.showcaseItems.filter((_, i) => i % 2 !== 0).map((project, i) => (
            <VideoProjectCard
              key={i * 2 + 1}
              project={project}
              tryItLabel={projects.tryItLabel}
              expandLabel={projects.expandLabel}
              collapseLabel={projects.collapseLabel}
            />
          ))}
        </div>
      </div>
    </Section>
  )
}
