import React from 'react'
import { NavLink } from 'react-router-dom'
import { ShieldAlert, Search, MailCheck, PlugZap, Settings2, X } from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: ShieldAlert, exact: true },
  { to: '/scan', label: 'Scan Email', icon: Search },
  { to: '/incidents', label: 'Incidents', icon: MailCheck },
  { to: '/integrations', label: 'Integrations', icon: PlugZap },
  { to: '/admin', label: 'Admin', icon: Settings2 },
]

function navClass({ isActive }) {
  return `mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
    isActive
      ? 'bg-zinc-100 text-zinc-900'
      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
  }`
}

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        } lg:hidden`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white shadow-sm transition-transform lg:z-30 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-zinc-900 px-3 py-2 text-white text-sm font-semibold">PG</div>
            <div>
              <div className="text-sm font-semibold">PhishGuard</div>
              <div className="text-xs text-zinc-500">Email Threat Defense</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="px-3">
          {items.map((it) => {
            const Icon = it.icon
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.exact}
                className={navClass}
                onClick={() => onClose?.()}
              >
                <Icon size={18} />
                {it.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto p-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
            <div className="font-semibold text-zinc-800">MVP • Local dev</div>
            <div className="mt-1">Use <span className="font-mono">/scan</span> to analyze suspicious emails and <span className="font-mono">/incidents</span> to triage.</div>
          </div>
        </div>
      </aside>
    </>
  )
}
