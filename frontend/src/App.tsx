import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Portfolio } from './Portfolio'
import { AdminPage } from './components/admin/AdminPage'
import { LangProvider } from './i18n'
import { SettingsProvider } from './contexts/SettingsContext'

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <LangProvider>
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/admin/*" element={<AdminPage />} />
          </Routes>
        </LangProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}

export default App
