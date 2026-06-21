import { useEffect } from 'react'

export function BackgroundEffects() {
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Orb 1 — top right, cyan */}
      <div className="animate-orb-1 absolute -right-48 -top-48 h-[700px] w-[700px] rounded-full bg-accent-400/10 blur-3xl dark:bg-accent-400/[0.06]" />

      {/* Orb 2 — bottom left, violet */}
      <div className="animate-orb-2 absolute -bottom-48 -left-48 h-[600px] w-[600px] rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-400/[0.07]" />

      {/* Orb 3 — center page, very subtle cyan — wrapper centers, inner animates */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-orb-3 h-[500px] w-[500px] rounded-full bg-accent-300/[0.06] blur-3xl dark:bg-accent-300/[0.04]" />
      </div>

      {/* Mouse-follow glow */}
      <div className="mouse-glow fixed inset-0" />
    </div>
  )
}
