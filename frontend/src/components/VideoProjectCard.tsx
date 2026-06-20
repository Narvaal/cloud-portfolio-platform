import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Play } from 'lucide-react'
import { GitHubIcon, YouTubeIcon } from './ui/BrandIcons'
import { Tag } from './ui/Tag'
import type { VideoProject } from '../types'

interface Props {
  project: VideoProject
  tryItLabel: string
  expandLabel: string
  collapseLabel: string
}

export function VideoProjectCard({ project, tryItLabel, expandLabel, collapseLabel }: Props) {
  const [expanded, setExpanded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (expanded) {
      v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [expanded])

  function toggle() {
    setExpanded((prev) => !prev)
  }

  function openLink(e: React.MouseEvent, url: string) {
    e.stopPropagation()
    window.open(url, '_blank', 'noreferrer')
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">

      {/* Single clickable wrapper */}
      <div onClick={toggle} className="cursor-pointer select-none">

        {/* Video area */}
        <div className="relative overflow-hidden" style={{ aspectRatio: project.aspectRatio ?? '1 / 1' }}>
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          >
            <source src={project.videoUrl} type="video/mp4" />
          </video>
        </div>

        {/* Footer row */}
        <div className="flex items-start justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {project.title}
              </span>
              {project.repoUrl && (
                <button
                  type="button"
                  onClick={(e) => openLink(e, project.repoUrl!)}
                  aria-label="GitHub repository"
                  className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <GitHubIcon className="size-3.5" />
                </button>
              )}
              {project.youtubeUrl && (
                <button
                  type="button"
                  onClick={(e) => openLink(e, project.youtubeUrl!)}
                  aria-label="Watch on YouTube"
                  className="text-zinc-400 transition-colors hover:text-red-500"
                >
                  <YouTubeIcon className="size-3.5" />
                </button>
              )}
            </div>
            {project.subtitle && (
              <p className="mt-0.5 text-xs italic text-zinc-400 dark:text-zinc-500">
                {project.subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 pl-4">
            {project.liveUrl && (
              <button
                type="button"
                onClick={(e) => openLink(e, project.liveUrl!)}
                aria-label="Try live demo"
                className="flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                <Play className="size-3 fill-white" />
                {tryItLabel}
              </button>
            )}
            <span className="text-xs italic text-zinc-400 dark:text-zinc-500">{project.year}</span>
          </div>
        </div>

        {/* Expand / collapse hint */}
        <div className="flex items-center justify-center gap-1.5 border-t border-zinc-100 py-2 dark:border-zinc-800">
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-zinc-400"
          >
            <ChevronDown className="size-3.5" />
          </motion.span>
          <span className="text-xs text-zinc-400">
            {expanded ? collapseLabel : expandLabel}
          </span>
        </div>
      </div>

      {/* Expandable description */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="desc"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-100 px-4 pb-5 pt-3 dark:border-zinc-800">
              <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {project.description}
              </p>
              {project.stack.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <Tag key={tech}>{tech}</Tag>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
