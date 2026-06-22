import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useSettings } from '../../../contexts/SettingsContext'

type Section = 'projects' | 'experience' | 'about' | 'certifications'

const sections: { id: Section; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'certifications', label: 'Certifications' },
]

function ComingSoonBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 py-16 dark:border-zinc-700">
      <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">{label}</span>
      <p className="text-sm text-zinc-400">Editor coming soon</p>
    </div>
  )
}

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

export function ContentTab() {
  const [active, setActive] = useState<Section>('about')

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Content</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Edit site content. Changes take effect immediately.
      </p>

      <AvailabilityToggle />

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

      {active === 'about'          && <ComingSoonBlock label="About Editor" />}
      {active === 'experience'     && <ComingSoonBlock label="Experience Editor" />}
      {active === 'projects'       && <ComingSoonBlock label="Projects Editor" />}
      {active === 'certifications' && <ComingSoonBlock label="Certifications Editor" />}
    </div>
  )
}
