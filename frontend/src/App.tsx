import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Portfolio } from './Portfolio'
import { AdminPage } from './components/admin/AdminPage'
import { LangProvider } from './i18n'

function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <Routes>
          <Route path="/" element={<Portfolio />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </LangProvider>
    </BrowserRouter>
  )
}

export default App
