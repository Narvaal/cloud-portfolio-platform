import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { ExperienceItem, Project, VideoProject, Certification } from '../../../types'
import { useSettings } from '../../../contexts/SettingsContext'
import { useContent } from '../../../contexts/ContentContext'
import { putContent, getVideoList, getVideoUploadUrl, publishVideo, deleteVideo } from '../../../services/api'
import { en } from '../../../i18n/en'
import { pt } from '../../../i18n/pt'

type Section = 'about' | 'experience' | 'projects' | 'certifications'
type EditorLang = 'en' | 'pt'

const sections: { id: Section; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
]

// ── Shared primitives ─────────────────────────────────────────────────────────

const textareaClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100'

function AutoTextarea({ className, style: _style, rows: _rows, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // After react-textarea-autosize sets the new height, reset internal scrollTop.
  // Without this, the browser scrolls the textarea content down to show the cursor
  // during the height transition, leaving blank space above the text.
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [props.value])

  return (
    <TextareaAutosize
      {...props}
      ref={ref}
      minRows={1}
      maxRows={20}
      className={className ?? textareaClass}
    />
  )
}

function SaveRow({
  saving,
  saved,
  onSave,
}: {
  saving: boolean
  saved: boolean
  onSave: () => void
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && (
        <span className="flex items-center gap-1 text-xs text-emerald-500">
          <CheckCircle className="size-3.5" />
          Saved
        </span>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {children}
    </label>
  )
}


// ── Open to Work toggle ───────────────────────────────────────────────────────

function AvailabilityToggle() {
  const { settings, updateSetting } = useSettings()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleToggle() {
    setSaving(true)
    setSaved(false)
    const next = !settings.openToWork
    await updateSetting('open_to_work', String(next))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Open to Work</p>
          <p className="mt-0.5 text-xs text-zinc-500">Controls the badge shown in the Hero section.</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckCircle className="size-3.5" />
            Saved
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          aria-pressed={settings.openToWork}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait ${
            settings.openToWork ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
              settings.openToWork ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${settings.openToWork ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
          {settings.openToWork
            ? 'Visible — Open to Work badge is showing'
            : 'Hidden — badge is not showing'}
        </span>
      </div>
    </div>
  )
}

// ── About editor ──────────────────────────────────────────────────────────────

function AboutEditor({ editorLang }: { editorLang: EditorLang }) {
  const { content, refreshContent } = useContent()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fallback = editorLang === 'en' ? en.about : pt.about

  const [paragraphs, setParagraphs] = useState<string[]>(
    () => content?.about?.[editorLang]?.paragraphs ?? fallback.paragraphs,
  )
  const [skillsText, setSkillsText] = useState<string>(
    () => (content?.about?.[editorLang]?.skills ?? en.about.skills).join('\n'),
  )

  // Re-init when editor language tab switches
  useEffect(() => {
    const ab = content?.about?.[editorLang]
    const fb = editorLang === 'en' ? en.about : pt.about
    setParagraphs(ab?.paragraphs ?? fb.paragraphs)
    setSkillsText((ab?.skills ?? en.about.skills).join('\n'))
  }, [editorLang]) // intentionally not including content — user edits shouldn't be overwritten mid-session

  function updateParagraph(i: number, value: string) {
    setParagraphs((prev) => prev.map((p, idx) => (idx === i ? value : p)))
  }

  function addParagraph() {
    setParagraphs((prev) => [...prev, ''])
  }

  function removeParagraph(i: number) {
    setParagraphs((prev) => prev.filter((_, idx) => idx !== i))
  }

  function moveParagraph(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= paragraphs.length) return
    setParagraphs((prev) => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const skills = skillsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    await putContent('about', editorLang, { paragraphs, skills })
    await refreshContent()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <SectionLabel>Paragraphs</SectionLabel>
        <div className="space-y-3">
          {paragraphs.map((p, i) => (
            <div key={i} className="flex gap-2">
              <AutoTextarea
                value={p}
                onChange={(e) => updateParagraph(i, e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
              <div className="flex shrink-0 items-center gap-0.5 self-start pt-1">
                <button
                  type="button"
                  onClick={() => moveParagraph(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveParagraph(i, 1)}
                  disabled={i === paragraphs.length - 1}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeParagraph(i)}
                  disabled={paragraphs.length === 1}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-25 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addParagraph}
          className="mt-3 text-xs font-medium text-accent-500 hover:text-accent-400"
        >
          + Add paragraph
        </button>
      </div>

      <div className="mb-6">
        <SectionLabel>
          Skills{' '}
          <span className="font-normal text-zinc-400">(one per line)</span>
        </SectionLabel>
        <AutoTextarea
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
        />
        <p className="mt-1 text-xs text-zinc-400">
          {skillsText.split('\n').filter((s) => s.trim()).length} skills — same list is used for both EN and PT
        </p>
      </div>

      <SaveRow saving={saving} saved={saved} onSave={handleSave} />
    </div>
  )
}

// ── Experience editor ─────────────────────────────────────────────────────────

function newItem(): ExperienceItem {
  return { company: '', role: '', period: '', location: '', description: '', highlights: [''], stack: [] }
}

function ExperienceEditor({ editorLang }: { editorLang: EditorLang }) {
  const { content, refreshContent } = useContent()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(0)

  const fallback = editorLang === 'en' ? en.experience.items : pt.experience.items

  const [items, setItems] = useState<ExperienceItem[]>(
    () => (content?.experience?.[editorLang] as ExperienceItem[] | undefined) ?? fallback,
  )

  useEffect(() => {
    const fromContent = content?.experience?.[editorLang] as ExperienceItem[] | undefined
    setItems(fromContent ?? (editorLang === 'en' ? en.experience.items : pt.experience.items))
    setExpanded(0)
  }, [editorLang])

  function updateField<K extends keyof ExperienceItem>(i: number, key: K, value: ExperienceItem[K]) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item))
  }

  function updateHighlight(i: number, hi: number, value: string) {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const highlights = item.highlights.map((h, j) => j === hi ? value : h)
      return { ...item, highlights }
    }))
  }

  function addHighlight(i: number) {
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, highlights: [...item.highlights, ''] } : item
    ))
  }

  function removeHighlight(i: number, hi: number) {
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, highlights: item.highlights.filter((_, j) => j !== hi) } : item
    ))
  }

  function moveHighlight(i: number, hi: number, dir: -1 | 1) {
    const hj = hi + dir
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      if (hj < 0 || hj >= item.highlights.length) return item
      const highlights = [...item.highlights]
      ;[highlights[hi], highlights[hj]] = [highlights[hj], highlights[hi]]
      return { ...item, highlights }
    }))
  }

  function addItem() {
    setItems(prev => [...prev, newItem()])
    setExpanded(items.length)
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
    setExpanded(null)
  }

  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    setItems(prev => {
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setExpanded(j)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const cleaned = items.map(item => ({
      ...item,
      location: item.location?.trim() || undefined,
      highlights: item.highlights.filter(Boolean),
      stack: typeof item.stack === 'string'
        ? (item.stack as string).split('\n').map(s => s.trim()).filter(Boolean)
        : item.stack,
    }))
    await putContent('experience', editorLang, cleaned)
    await refreshContent()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700">
            {/* Card header */}
            <div className="flex items-center gap-2 p-4">
              <button
                type="button"
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <ChevronDown
                  className={`size-4 shrink-0 text-zinc-400 transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.company || <span className="italic text-zinc-400">New item</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-400">
                    {[item.role, item.period].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, 1)}
                  disabled={i === items.length - 1}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Expanded fields */}
            {expanded === i && (
              <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-4 dark:border-zinc-700/60">
                {/* Row: company + role */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <SectionLabel>Company</SectionLabel>
                    <input
                      value={item.company}
                      onChange={e => updateField(i, 'company', e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <SectionLabel>Role</SectionLabel>
                    <input
                      value={item.role}
                      onChange={e => updateField(i, 'role', e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Row: period + location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <SectionLabel>Period</SectionLabel>
                    <input
                      value={item.period}
                      onChange={e => updateField(i, 'period', e.target.value)}
                      placeholder="e.g. Jun 2021 — Sep 2024"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <SectionLabel>Location <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                    <input
                      value={item.location ?? ''}
                      onChange={e => updateField(i, 'location', e.target.value)}
                      placeholder="e.g. São Paulo, Brazil"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <SectionLabel>Description</SectionLabel>
                  <AutoTextarea
                    value={item.description}
                    onChange={e => updateField(i, 'description', e.target.value)}
                  />
                </div>

                {/* Highlights */}
                <div>
                  <SectionLabel>Highlights</SectionLabel>
                  <div className="space-y-2">
                    {item.highlights.map((h, hi) => (
                      <div key={hi} className="flex gap-2">
                        <AutoTextarea
                          value={h}
                          onChange={e => updateHighlight(i, hi, e.target.value)}
                          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                        />
                        <div className="flex shrink-0 items-center gap-0.5 self-start pt-1">
                          <button
                            type="button"
                            onClick={() => moveHighlight(i, hi, -1)}
                            disabled={hi === 0}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveHighlight(i, hi, 1)}
                            disabled={hi === item.highlights.length - 1}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHighlight(i, hi)}
                            disabled={item.highlights.length === 1}
                            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-25 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addHighlight(i)}
                    className="mt-2 text-xs font-medium text-accent-500 hover:text-accent-400"
                  >
                    + Add highlight
                  </button>
                </div>

                {/* Stack */}
                <div>
                  <SectionLabel>Stack <span className="font-normal text-zinc-400">(one per line)</span></SectionLabel>
                  <AutoTextarea
                    value={Array.isArray(item.stack) ? item.stack.join('\n') : item.stack}
                    onChange={e => updateField(i, 'stack', e.target.value.split('\n') as unknown as string[])}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="mt-4 text-xs font-medium text-accent-500 hover:text-accent-400"
      >
        + Add experience
      </button>

      <div className="mt-4">
        <SaveRow saving={saving} saved={saved} onSave={handleSave} />
      </div>
    </div>
  )
}

// ── Video field ───────────────────────────────────────────────────────────────

const ASPECT_RATIOS = ['16 / 9', '4 / 3', '1 / 1', '9 / 16', '21 / 9']

function VideoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [files, setFiles] = useState<string[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [step, setStep] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getVideoList().then(f => { setFiles(f); setLoadingList(false) })
  }, [])

  async function handleFile(file: File) {
    setStep('Getting URL…')
    const url = await getVideoUploadUrl(file.name)
    if (!url) { setStep(''); return }
    setStep('Uploading…')
    await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': 'video/mp4' } })
    setStep('Publishing…')
    await publishVideo()
    const updated = await getVideoList()
    setFiles(updated)
    onChange(`/showcase/video/${file.name}`)
    setStep('Done!')
    setTimeout(() => setStep(''), 1500)
  }

  async function handleDelete() {
    if (!currentFile) return
    if (!window.confirm(`Delete "${currentFile}" from S3? This cannot be undone.`)) return
    setStep('Deleting…')
    await deleteVideo(currentFile)
    const updated = await getVideoList()
    setFiles(updated)
    onChange('')
    setStep('')
  }

  const currentFile = value.replace('/showcase/video/', '')

  return (
    <div className="flex gap-2">
      {step ? (
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/60">
          {step !== 'Done!' && <span className="size-3 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />}
          <span className="text-zinc-500">{step}</span>
        </div>
      ) : (
        <select
          value={currentFile}
          onChange={e => onChange(e.target.value ? `/showcase/video/${e.target.value}` : '')}
          disabled={loadingList}
          className={`flex-1 ${inputClass}`}
        >
          <option value="">{loadingList ? 'Loading…' : '— select video —'}</option>
          {files.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      <input ref={inputRef} type="file" accept="video/mp4" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={!!step}
        className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
        Upload
      </button>
      {currentFile && !step && (
        <button type="button" onClick={handleDelete}
          className="shrink-0 rounded-lg border border-zinc-200 p-2 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-zinc-700 dark:hover:bg-red-900/20 dark:hover:text-red-400">
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Projects editor ───────────────────────────────────────────────────────────

type ProjectsTab = 'featured' | 'showcase'

function newProject(): Project {
  return { title: '', description: '', stack: [], repoUrl: '', liveUrl: '', featured: false }
}

function newVideoProject(): VideoProject {
  return { title: '', subtitle: '', year: '', description: '', stack: [], videoUrl: '', aspectRatio: '16 / 9', liveUrl: '', repoUrl: '', youtubeUrl: '' }
}

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100'

function ProjectsEditor({ editorLang }: { editorLang: EditorLang }) {
  const { content, refreshContent } = useContent()
  const [tab, setTab] = useState<ProjectsTab>(
    () => (localStorage.getItem('admin_projects_tab') as ProjectsTab | null) ?? 'featured',
  )
  function goProjectsTab(t: ProjectsTab) { setTab(t); localStorage.setItem('admin_projects_tab', t) }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedFeatured, setExpandedFeatured] = useState<number | null>(0)
  const [expandedShowcase, setExpandedShowcase] = useState<number | null>(0)

  const fallback = editorLang === 'en' ? en.projects : pt.projects

  const [items, setItems] = useState<Project[]>(
    () => (content?.projects?.[editorLang]?.items as Project[] | undefined) ?? fallback.items,
  )
  const [showcaseItems, setShowcaseItems] = useState<VideoProject[]>(
    () => (content?.projects?.[editorLang]?.showcaseItems as VideoProject[] | undefined) ?? fallback.showcaseItems,
  )

  useEffect(() => {
    const p = content?.projects?.[editorLang]
    const fb = editorLang === 'en' ? en.projects : pt.projects
    setItems((p?.items as Project[] | undefined) ?? fb.items)
    setShowcaseItems((p?.showcaseItems as VideoProject[] | undefined) ?? fb.showcaseItems)
    setExpandedFeatured(0)
    setExpandedShowcase(0)
  }, [editorLang])

  // ── Featured helpers ──────────────────────────────────────────────────────

  function updateItem<K extends keyof Project>(i: number, key: K, value: Project[K]) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item))
  }

  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    setItems(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n })
    setExpandedFeatured(j)
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
    setExpandedFeatured(null)
  }

  // ── Showcase helpers ──────────────────────────────────────────────────────

  function updateShowcase<K extends keyof VideoProject>(i: number, key: K, value: VideoProject[K]) {
    setShowcaseItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item))
  }

  function moveShowcase(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= showcaseItems.length) return
    setShowcaseItems(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n })
    setExpandedShowcase(j)
  }

  function removeShowcase(i: number) {
    setShowcaseItems(prev => prev.filter((_, idx) => idx !== i))
    setExpandedShowcase(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const cleanItems = items.map(item => ({
      ...item,
      stack: Array.isArray(item.stack) ? item.stack : (item.stack as string).split('\n').map(s => s.trim()).filter(Boolean),
      repoUrl: (item.repoUrl ?? '').trim() || undefined,
      liveUrl: (item.liveUrl ?? '').trim() || undefined,
    }))
    const cleanShowcase = showcaseItems.map(item => ({
      ...item,
      stack: Array.isArray(item.stack) ? item.stack : (item.stack as string).split('\n').map(s => s.trim()).filter(Boolean),
      subtitle: (item.subtitle ?? '').trim() || undefined,
      aspectRatio: (item.aspectRatio ?? '').trim() || undefined,
      liveUrl: (item.liveUrl ?? '').trim() || undefined,
      repoUrl: (item.repoUrl ?? '').trim() || undefined,
      youtubeUrl: (item.youtubeUrl ?? '').trim() || undefined,
    }))
    await putContent('projects', editorLang, { items: cleanItems, showcaseItems: cleanShowcase })
    await refreshContent()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Reorder/delete button group ───────────────────────────────────────────

  function ReorderButtons({ i, total, onUp, onDown, onDelete }: {
    i: number; total: number
    onUp: () => void; onDown: () => void; onDelete: () => void
  }) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onUp} disabled={i === 0}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700">
          <ChevronUp className="size-3.5" />
        </button>
        <button type="button" onClick={onDown} disabled={i === total - 1}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700">
          <ChevronDown className="size-3.5" />
        </button>
        <button type="button" onClick={onDelete}
          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {(['featured', 'showcase'] as const).map(t => (
          <button key={t} onClick={() => goProjectsTab(t)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Featured ── */}
      {tab === 'featured' && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 p-4">
                <button type="button" onClick={() => setExpandedFeatured(expandedFeatured === i ? null : i)}
                  className="flex flex-1 items-center gap-3 text-left">
                  <ChevronDown className={`size-4 shrink-0 text-zinc-400 transition-transform ${expandedFeatured === i ? 'rotate-180' : ''}`} />
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.title || <span className="italic text-zinc-400">New project</span>}
                  </p>
                </button>
                <ReorderButtons i={i} total={items.length}
                  onUp={() => moveItem(i, -1)} onDown={() => moveItem(i, 1)} onDelete={() => removeItem(i)} />
              </div>

              {expandedFeatured === i && (
                <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-4 dark:border-zinc-700/60">
                  <div>
                    <SectionLabel>Title</SectionLabel>
                    <input value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <SectionLabel>Description</SectionLabel>
                    <AutoTextarea value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  </div>
                  <div>
                    <SectionLabel>Stack <span className="font-normal text-zinc-400">(one per line)</span></SectionLabel>
                    <AutoTextarea
                      value={Array.isArray(item.stack) ? item.stack.join('\n') : item.stack}
                      onChange={e => updateItem(i, 'stack', e.target.value.split('\n') as unknown as string[])}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SectionLabel>Repo URL <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                      <input value={item.repoUrl ?? ''} onChange={e => updateItem(i, 'repoUrl', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <SectionLabel>Live URL <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                      <input value={item.liveUrl ?? ''} onChange={e => updateItem(i, 'liveUrl', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={!!item.featured}
                      onChange={e => updateItem(i, 'featured', e.target.checked)}
                      className="size-4 rounded accent-accent-500" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Featured (highlighted card)</span>
                  </label>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={() => { setItems(p => [...p, newProject()]); setExpandedFeatured(items.length) }}
            className="mt-1 text-xs font-medium text-accent-500 hover:text-accent-400">
            + Add project
          </button>
        </div>
      )}

      {/* ── Showcase ── */}
      {tab === 'showcase' && (
        <div className="space-y-3">
          {showcaseItems.map((item, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 p-4">
                <button type="button" onClick={() => setExpandedShowcase(expandedShowcase === i ? null : i)}
                  className="flex flex-1 items-center gap-3 text-left">
                  <ChevronDown className={`size-4 shrink-0 text-zinc-400 transition-transform ${expandedShowcase === i ? 'rotate-180' : ''}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.title || <span className="italic text-zinc-400">New showcase item</span>}
                    </p>
                    {item.subtitle && <p className="truncate text-xs text-zinc-400">{item.subtitle}</p>}
                  </div>
                </button>
                <ReorderButtons i={i} total={showcaseItems.length}
                  onUp={() => moveShowcase(i, -1)} onDown={() => moveShowcase(i, 1)} onDelete={() => removeShowcase(i)} />
              </div>

              {expandedShowcase === i && (
                <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-4 dark:border-zinc-700/60">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SectionLabel>Title</SectionLabel>
                      <input value={item.title} onChange={e => updateShowcase(i, 'title', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <SectionLabel>Subtitle <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                      <input value={item.subtitle ?? ''} onChange={e => updateShowcase(i, 'subtitle', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SectionLabel>Year</SectionLabel>
                      <input value={item.year} onChange={e => updateShowcase(i, 'year', e.target.value)} placeholder="e.g. Apr 2026" className={inputClass} />
                    </div>
                    <div>
                      <SectionLabel>Aspect Ratio</SectionLabel>
                      <select value={item.aspectRatio ?? '16 / 9'} onChange={e => updateShowcase(i, 'aspectRatio', e.target.value)} className={inputClass}>
                        {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Description</SectionLabel>
                    <AutoTextarea value={item.description} onChange={e => updateShowcase(i, 'description', e.target.value)} />
                  </div>
                  <div>
                    <SectionLabel>Stack <span className="font-normal text-zinc-400">(one per line)</span></SectionLabel>
                    <AutoTextarea
                      value={Array.isArray(item.stack) ? item.stack.join('\n') : item.stack}
                      onChange={e => updateShowcase(i, 'stack', e.target.value.split('\n') as unknown as string[])}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <SectionLabel>Video</SectionLabel>
                    <VideoField value={item.videoUrl} onChange={v => updateShowcase(i, 'videoUrl', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SectionLabel>Live URL <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                      <input value={item.liveUrl ?? ''} onChange={e => updateShowcase(i, 'liveUrl', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <SectionLabel>Repo URL <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                      <input value={item.repoUrl ?? ''} onChange={e => updateShowcase(i, 'repoUrl', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <SectionLabel>YouTube URL <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                    <input value={item.youtubeUrl ?? ''} onChange={e => updateShowcase(i, 'youtubeUrl', e.target.value)} className={inputClass} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={() => { setShowcaseItems(p => [...p, newVideoProject()]); setExpandedShowcase(showcaseItems.length) }}
            className="mt-1 text-xs font-medium text-accent-500 hover:text-accent-400">
            + Add showcase item
          </button>
        </div>
      )}

      <div className="mt-6">
        <SaveRow saving={saving} saved={saved} onSave={handleSave} />
      </div>
    </div>
  )
}

// ── Certifications editor ─────────────────────────────────────────────────────

function newCert(): Certification {
  return { name: '', issuer: '', year: '', credentialUrl: '' }
}

function CertificationsEditor({ editorLang }: { editorLang: EditorLang }) {
  const { content, refreshContent } = useContent()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fallback = editorLang === 'en' ? en.certifications.items : pt.certifications.items

  const [items, setItems] = useState<Certification[]>(
    () => (content?.certifications?.[editorLang] as Certification[] | undefined) ?? fallback,
  )

  useEffect(() => {
    const fromContent = content?.certifications?.[editorLang] as Certification[] | undefined
    setItems(fromContent ?? (editorLang === 'en' ? en.certifications.items : pt.certifications.items))
  }, [editorLang])

  function update<K extends keyof Certification>(i: number, key: K, value: Certification[K]) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    setItems(prev => { const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }

  function remove(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const cleaned = items.map(item => ({
      name: item.name.trim(),
      issuer: item.issuer.trim(),
      year: item.year?.trim() || undefined,
      credentialUrl: item.credentialUrl?.trim() || undefined,
    }))
    await putContent('certifications', editorLang, cleaned)
    await refreshContent()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700">
            {/* Header with reorder + delete */}
            <div className="flex items-center gap-2 px-4 py-3">
              <p className="flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {item.name || <span className="italic text-zinc-400">New certification</span>}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700">
                  <ChevronUp className="size-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-25 dark:hover:bg-zinc-700">
                  <ChevronDown className="size-3.5" />
                </button>
                <button type="button" onClick={() => remove(i)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-700/60">
              <div>
                <SectionLabel>Name</SectionLabel>
                <input value={item.name} onChange={e => update(i, 'name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <SectionLabel>Issuer</SectionLabel>
                <input value={item.issuer} onChange={e => update(i, 'issuer', e.target.value)} className={inputClass} />
              </div>
              <div>
                <SectionLabel>Year <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                <input value={item.year ?? ''} onChange={e => update(i, 'year', e.target.value)} placeholder="e.g. Jun 2025" className={inputClass} />
              </div>
              <div>
                <SectionLabel>Credential URL <span className="font-normal text-zinc-400">(optional)</span></SectionLabel>
                <input value={item.credentialUrl ?? ''} onChange={e => update(i, 'credentialUrl', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setItems(p => [...p, newCert()])}
        className="mt-4 text-xs font-medium text-accent-500 hover:text-accent-400">
        + Add certification
      </button>

      <div className="mt-4">
        <SaveRow saving={saving} saved={saved} onSave={handleSave} />
      </div>
    </div>
  )
}

// ── ContentTab root ───────────────────────────────────────────────────────────

export function ContentTab() {
  const [active, setActive] = useState<Section>(
    () => (localStorage.getItem('admin_content_section') as Section | null) ?? 'about',
  )
  const [editorLang, setEditorLang] = useState<EditorLang>(
    () => (localStorage.getItem('admin_content_lang') as EditorLang | null) ?? 'en',
  )

  function goSection(s: Section) {
    setActive(s)
    localStorage.setItem('admin_content_section', s)
  }

  function goLang(l: EditorLang) {
    setEditorLang(l)
    localStorage.setItem('admin_content_lang', l)
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Content</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Edit site content. Changes take effect immediately without a deploy.
      </p>

      <AvailabilityToggle />

      {/* Lang switcher */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">Editing language:</span>
        {(['en', 'pt'] as const).map((l) => (
          <button
            key={l}
            onClick={() => goLang(l)}
            className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition-colors ${
              editorLang === l
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Section tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => goSection(s.id)}
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

      {active === 'about'          && <AboutEditor editorLang={editorLang} />}
      {active === 'experience'     && <ExperienceEditor editorLang={editorLang} />}
      {active === 'projects'       && <ProjectsEditor editorLang={editorLang} />}
      {active === 'certifications' && <CertificationsEditor editorLang={editorLang} />}
    </div>
  )
}
