import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Scan from './pages/Scan.jsx'
import Incidents from './pages/Incidents.jsx'
import Integrations from './pages/Integrations.jsx'
import Admin from './pages/Admin.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="scan" element={<Scan />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<Incidents />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
