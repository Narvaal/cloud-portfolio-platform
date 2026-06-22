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

const defaults: Settings = { openToWork: profile.openToWork }

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSetting: async () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults)

  useEffect(() => {
    getSettings().then((raw) => {
      setSettings({
        openToWork: 'open_to_work' in raw ? raw['open_to_work'] === 'true' : profile.openToWork,
      })
    })
  }, [])

  async function updateSetting(key: string, value: string) {
    await patchSetting(key, value)
    if (key === 'open_to_work') {
      setSettings((prev) => ({ ...prev, openToWork: value === 'true' }))
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
