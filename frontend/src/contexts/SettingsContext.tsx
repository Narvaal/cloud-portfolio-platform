import { createContext, useContext, useEffect, useState } from 'react'
import { getSettings, patchSetting } from '../services/api'
import { profile } from '../data/profile'

interface Settings {
  openToWork: boolean
  email: string
  githubUrl: string
  linkedinUrl: string
}

interface SettingsContextValue {
  settings: Settings
  updateSetting: (key: string, value: string) => Promise<void>
}

const STORAGE_KEY = 'portfolio_settings'

const defaults: Settings = {
  openToWork: profile.openToWork,
  email: profile.email,
  githubUrl: profile.socials.find((s) => s.icon === 'github')?.href ?? '',
  linkedinUrl: profile.socials.find((s) => s.icon === 'linkedin')?.href ?? '',
}

function rawToSettings(raw: Record<string, string>): Settings {
  return {
    openToWork: 'open_to_work' in raw ? raw['open_to_work'] === 'true' : defaults.openToWork,
    email: raw['contact_email'] || defaults.email,
    githubUrl: raw['github_url'] || defaults.githubUrl,
    linkedinUrl: raw['linkedin_url'] || defaults.linkedinUrl,
  }
}

function readFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    return { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return defaults
  }
}

function writeToStorage(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSetting: async () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readFromStorage)

  useEffect(() => {
    getSettings().then((raw) => {
      const next = rawToSettings(raw)
      setSettings(next)
      writeToStorage(next)
    })
  }, [])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        setSettings((prev) => ({ ...prev, ...(JSON.parse(e.newValue!) as Partial<Settings>) }))
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function updateSetting(key: string, value: string) {
    await patchSetting(key, value)
    setSettings((prev) => {
      let next = { ...prev }
      if (key === 'open_to_work') next = { ...next, openToWork: value === 'true' }
      if (key === 'contact_email') next = { ...next, email: value }
      if (key === 'github_url') next = { ...next, githubUrl: value }
      if (key === 'linkedin_url') next = { ...next, linkedinUrl: value }
      writeToStorage(next)
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
