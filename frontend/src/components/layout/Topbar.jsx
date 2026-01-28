import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Activity } from 'lucide-react'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { api } from '../../api/client.js'

function pageFromPath(pathname) {
  if (pathname === '/' || pathname === '') return 'Dashboard'
  const p = pathname.split('?')[0]
  if (p.startsWith('/scan')) return 'Scan'
  if (p.startsWith('/incidents')) return 'Incidents'
  if (p.startsWith('/integrations')) return 'Integrations'
  if (p.startsWith('/admin')) return 'Admin'
  return 'PhishGuard'
}

export default function Topbar({ onOpenSidebar }) {
  const { pathname } = useLocation()
  const page = useMemo(() => pageFromPath(pathname), [pathname])
  const [health, setHealth] = useState({ ok: null, latencyMs: null })

  useEffect(() => {
    let mounted = true

    const ping = async () => {
      const t0 = performance.now()
      try {
        await api.health()
        const dt = Math.round(performance.now() - t0)
        if (mounted) setHealth({ ok: true, latencyMs: dt })
      } catch {
        if (mounted) setHealth({ ok: false, latencyMs: null })
      }
    }

    ping()
    const id = window.setInterval(ping, 15000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="font-semibold text-zinc-900 hover:underline">
              PhishGuard
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-600">{page}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 md:flex">
            <Activity size={16} />
            <span className="font-medium">API</span>
            {health.ok === null ? (
              <Badge tone="neutral">checking…</Badge>
            ) : health.ok ? (
              <Badge tone="green">
                healthy{typeof health.latencyMs === 'number' ? ` • ${health.latencyMs}ms` : ''}
              </Badge>
            ) : (
              <Badge tone="red">offline</Badge>
            )}
          </div>

          <Link to="/scan" className="hidden md:inline-flex">
            <Button variant="primary">Quick scan</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
