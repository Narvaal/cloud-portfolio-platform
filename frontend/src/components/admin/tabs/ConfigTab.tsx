import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { useSettings } from '../../../contexts/SettingsContext'

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100'

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-zinc-400">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )
}

export function ConfigTab() {
  const { settings, updateSetting } = useSettings()

  const [email, setEmail] = useState(settings.email)
  const [githubUrl, setGithubUrl] = useState(settings.githubUrl)
  const [linkedinUrl, setLinkedinUrl] = useState(settings.linkedinUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await Promise.all([
      updateSetting('contact_email', email.trim()),
      updateSetting('github_url', githubUrl.trim()),
      updateSetting('linkedin_url', linkedinUrl.trim()),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Config</h2>
      <p className="mb-8 text-sm text-zinc-500">
        Profile links and contact email used across the site. Changes take effect immediately.
      </p>

      <div className="space-y-6 rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <Field
          label="Contact Email"
          hint="Used for receiving contact form messages and displayed in the footer / hero."
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@example.com"
        />
        <Field
          label="GitHub URL"
          value={githubUrl}
          onChange={setGithubUrl}
          placeholder="https://github.com/username"
        />
        <Field
          label="LinkedIn URL"
          value={linkedinUrl}
          onChange={setLinkedinUrl}
          placeholder="https://linkedin.com/in/username"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
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
    </div>
  )
}
