import React from 'react'
import { useAuth } from './hooks/useAuth'
import Auth from './components/Auth'
import AdminDashboard from './components/AdminDashboard'
import UserDashboard from './components/UserDashboard'

function App() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return isAdmin() ? <AdminDashboard /> : <UserDashboard />
}

export default App