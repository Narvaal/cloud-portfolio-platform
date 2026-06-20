import { useState } from 'react'
import { Upload, FileText, CheckCircle } from 'lucide-react'

interface UploadAreaProps {
  lang: 'EN' | 'PT'
  currentUrl: string
}

function UploadArea({ lang, currentUrl }: UploadAreaProps) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') setFile(dropped)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Resume — {lang}
          </p>
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-accent-500 hover:underline"
          >
            <FileText className="size-3" />
            View current
          </a>
        </div>
        {file && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckCircle className="size-3.5" />
            {file.name}
          </span>
        )}
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors ${
          dragging
            ? 'border-accent-500 bg-accent-500/5'
            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
        }`}
      >
        <Upload className={`size-6 ${dragging ? 'text-accent-500' : 'text-zinc-400'}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Drop PDF here or <span className="text-accent-500">browse</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">PDF only · max 5 MB</p>
        </div>
        <input type="file" accept=".pdf" className="hidden" onChange={handleChange} />
      </label>

      <button
        disabled={!file}
        className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Upload & Publish
      </button>
    </div>
  )
}

export function ResumeTab() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Resume</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Upload a new PDF to replace the current resume. It will be published instantly.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <UploadArea lang="EN" currentUrl="/resume/en/Alessandro_Bezerra_Java_Backend_Engineer.pdf" />
        <UploadArea lang="PT" currentUrl="/resume/pt/Alessandro_Bezerra_Java_Backend_Engineer.pdf" />
      </div>
    </div>
  )
}
