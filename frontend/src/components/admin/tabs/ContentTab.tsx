import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
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
              <textarea
                value={p}
                onChange={(e) => updateParagraph(i, e.target.value)}
                rows={3}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={() => removeParagraph(i)}
                disabled={paragraphs.length === 1}
                className="shrink-0 self-start rounded-lg px-2.5 py-2 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                Remove
              </button>
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
        <textarea
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          rows={8}
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

// ── ContentTab root ───────────────────────────────────────────────────────────

export function ContentTab() {
  const [active, setActive] = useState<Section>('about')
  const [editorLang, setEditorLang] = useState<EditorLang>('en')

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
            onClick={() => setEditorLang(l)}
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
            onClick={() => setActive(s.id)}
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
      {active === 'experience'     && <ComingSoonBlock label="Experience Editor" />}
      {active === 'projects'       && <ComingSoonBlock label="Projects Editor" />}
      {active === 'certifications' && <ComingSoonBlock label="Certifications Editor" />}
    </div>
  )
}
