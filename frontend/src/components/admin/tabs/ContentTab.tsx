import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { CheckCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { ExperienceItem } from '../../../types'
import { useSettings } from '../../../contexts/SettingsContext'
import { useContent } from '../../../contexts/ContentContext'
import { putContent } from '../../../services/api'
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

function ComingSoonBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 py-16 dark:border-zinc-700">
      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">{label}</span>
      <p className="text-sm text-zinc-400">Editor coming soon</p>
    </div>
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
              <div className="flex shrink-0 flex-col items-center gap-0.5 self-start pt-1">
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
                        <div className="flex shrink-0 flex-col items-center gap-0.5 self-start pt-1">
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
      {active === 'projects'       && <ComingSoonBlock label="Projects Editor" />}
      {active === 'certifications' && <ComingSoonBlock label="Certifications Editor" />}
    </div>
  )
}
