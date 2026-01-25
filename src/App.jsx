import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase/firebase'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import ClientView from './components/ClientView'
import 'leaflet/dist/leaflet.css'

function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'admin' or 'client'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        // Admin access for specific email
        setRole(currentUser.email === 'aryark2102@gmail.com' ? 'admin' : 'client')
      } else {
        setRole(null)
      }
    })
    return unsubscribe
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '1rem' }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
            Geo-Verified Attendance System
          </h1>
          <div>
            <span>Welcome, {user.displayName || user.email}</span>
            <button onClick={handleLogout} style={{ marginLeft: '1rem', padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>

        {role === 'admin' ? <AdminDashboard /> : <ClientView user={user} />}
      </div>
    </div>
  )
}

export default App