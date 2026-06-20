import type { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

/** Centered, max-width content wrapper with responsive horizontal padding. */
export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>
      {children}
    </div>
  )
}
