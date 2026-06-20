interface TagProps {
  children: React.ReactNode
  variant?: 'stack' | 'skill'
}

export function Tag({ children, variant = 'stack' }: TagProps) {
  if (variant === 'skill') {
    return (
      <span className="inline-block cursor-default rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/60 dark:hover:shadow-zinc-900/60">
        {children}
      </span>
    )
  }

  return (
    <span className="inline-block cursor-default rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600 transition-all duration-150 hover:-translate-y-0.5 hover:bg-zinc-200 hover:shadow-sm dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:shadow-zinc-900/60">
      {children}
    </span>
  )
}
