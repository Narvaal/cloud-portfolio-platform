import { createContext, useContext, useEffect, useState } from 'react'
import { getSettings, patchSetting } from '../services/api'
import { profile } from '../data/profile'

interface Settings {
  openToWork: boolean
}

interface SettingsContextValue {
  settings: Settings
  updateSetting: (key: string, value: string) => Promise<void>
}

const STORAGE_KEY = 'portfolio_settings'
const defaults: Settings = { openToWork: profile.openToWork }

function readFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...defaults, ...parsed }
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
      const next: Settings = {
        openToWork: 'open_to_work' in raw ? raw['open_to_work'] === 'true' : profile.openToWork,
      }
      setSettings(next)
      writeToStorage(next)
    })
  }, [])

  // Sync changes from other tabs (admin → portfolio)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue) as Partial<Settings>
        setSettings((prev) => ({ ...prev, ...parsed }))
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function updateSetting(key: string, value: string) {
    await patchSetting(key, value)
    if (key === 'open_to_work') {
      setSettings((prev) => {
        const next = { ...prev, openToWork: value === 'true' }
        writeToStorage(next)
        return next
      })
    }
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
