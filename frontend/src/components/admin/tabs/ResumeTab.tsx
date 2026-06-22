import { useState } from 'react'
import { CheckCircle, FileText, Upload, XCircle } from 'lucide-react'
import { getResumeUploadUrl, publishResume } from '../../../services/api'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const RESUME_BASE = '/resume'
const FILENAME    = 'Alessandro_Bezerra_Java_Backend_Engineer.pdf'

function currentUrl(lang: 'EN' | 'PT') {
  return `${RESUME_BASE}/${lang.toLowerCase()}/${FILENAME}`
}

interface UploadAreaProps {
  lang: 'EN' | 'PT'
}

function UploadArea({ lang }: UploadAreaProps) {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [status, setStatus]       = useState<UploadStatus>('idle')
  const [progress, setProgress]   = useState<string>('')

  function pickFile(f: File | undefined) {
    if (!f) return
    if (f.type !== 'application/pdf') {
      alert('Only PDF files are accepted.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('File is too large — maximum 5 MB.')
      return
    }
    setFile(f)
    setStatus('idle')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    setProgress('Getting upload URL…')

    try {
      const uploadUrl = await getResumeUploadUrl(lang.toLowerCase() as 'en' | 'pt')
      if (!uploadUrl) throw new Error('Could not get upload URL')

      setProgress('Uploading to S3…')
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      })
      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`)

      setProgress('Invalidating CDN cache…')
      await publishResume()

      setStatus('success')
      setFile(null)
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setProgress('')
    }
  }

  const isUploading = status === 'uploading'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Resume — {lang}
          </p>
          <a
            href={currentUrl(lang)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-accent-500 hover:underline"
          >
            <FileText className="size-3" />
            View current
          </a>
        </div>
        {file && status === 'idle' && (
          <span className="max-w-[140px] truncate font-mono text-[10px] text-zinc-400">{file.name}</span>
        )}
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors ${
          dragging
            ? 'border-accent-500 bg-accent-500/5'
            : file
              ? 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50'
              : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
        }`}
      >
        <Upload className={`size-6 ${dragging ? 'text-accent-500' : file ? 'text-zinc-500' : 'text-zinc-400'}`} />
        <div className="text-center">
          {file ? (
            <>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{file.name}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {(file.size / 1024).toFixed(0)} KB · click to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Drop PDF here or <span className="text-accent-500">browse</span>
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">PDF only · max 5 MB</p>
            </>
          )}
        </div>
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </label>

      {/* Status feedback */}
      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle className="size-4 shrink-0" />
          Published! CloudFront cache cleared.
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          <XCircle className="size-4 shrink-0" />
          Upload failed — check console for details.
        </div>
      )}
      {isUploading && (
        <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-2.5 dark:bg-zinc-800">
          <p className="font-mono text-xs text-zinc-500">{progress}</p>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-1 w-full animate-pulse rounded-full bg-accent-500" />
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isUploading ? progress || 'Uploading…' : 'Upload & Publish'}
      </button>
    </div>
  )
}

export function ResumeTab() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Resume</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Upload a PDF to replace the current resume. The file is published to CloudFront instantly.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <UploadArea lang="EN" />
        <UploadArea lang="PT" />
      </div>
    </div>
  )
}
