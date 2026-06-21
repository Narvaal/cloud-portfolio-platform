import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Container } from './Container'

interface SectionProps {
  id: string
  eyebrow?: string
  title: string
  children: ReactNode
  className?: string
}

/** A page section with an anchor id, a consistent heading block and a
 *  scroll-into-view reveal animation. */
export function Section({
  id,
  eyebrow,
  title,
  children,
  className = '',
}: SectionProps) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${className}`}>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10">
            {eyebrow && (
              <p className="mb-2 font-mono text-sm font-medium text-accent-500">
                {eyebrow}
              </p>
            )}
            <h2 className="text-3xl sm:text-4xl">{title}</h2>
          </div>
          {children}
        </motion.div>
      </Container>
    </section>
  )
}
