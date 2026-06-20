import { useState } from 'react'
import { AdminLogin } from './AdminLogin'
import { AdminDashboard } from './AdminDashboard'

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(
    () => !!sessionStorage.getItem('admin_token'),
  )

  function handleLogout() {
    sessionStorage.removeItem('admin_token')
    setAuthenticated(false)
  }

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />
  }

  return <AdminDashboard onLogout={handleLogout} />
}
