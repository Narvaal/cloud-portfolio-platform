import { motion } from 'framer-motion'
import { Cloud, Code2, Mail, Sparkles } from 'lucide-react'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/10 px-4 py-1.5 font-mono text-sm text-accent-600 dark:text-accent-300">
          <Sparkles className="size-4" />
          stack ready
        </span>

        <h1 className="flex items-center gap-3 text-4xl sm:text-6xl">
          <Cloud className="size-10 text-accent-500 sm:size-14" />
          Cloud Portfolio Platform
        </h1>

        <p className="max-w-xl text-lg">
          React + TypeScript + Tailwind + Framer Motion + lucide-react +
          React Router — tudo configurado e pronto para construir as seções.
        </p>

        <div className="flex gap-3">
          <Code2 className="size-6 transition-colors hover:text-accent-500" />
          <Mail className="size-6 transition-colors hover:text-accent-500" />
        </div>
      </motion.div>
    </main>
  )
}

export default App
