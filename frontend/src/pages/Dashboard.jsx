import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import StatCard from '../components/StatCard.jsx'
import { Card, CardHeader, CardContent } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'

export default function Dashboard() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [integrations, setIntegrations] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [inc, ints] = await Promise.all([api.incidents(), api.integrations()])
        if (!mounted) return
        setIncidents(inc)
        setIntegrations(ints)
      } catch (e) {
        if (mounted) setErr(e.message)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const stats = useMemo(() => {
    const total = incidents.length
    const malicious = incidents.filter((i) => i.verdict === 'malicious').length
    const quarantined = incidents.filter((i) => i.quarantined).length
    const avgRisk = total ? incidents.reduce((a, b) => a + b.risk_score, 0) / total : 0
    return { total, malicious, quarantined, avgRisk }
  }, [incidents])

  const topAttackTypes = useMemo(() => {
    const map = new Map()
    for (const i of incidents) {
      const k = i.attack_type || 'unknown'
      map.set(k, (map.get(k) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [incidents])

  const integrationStats = useMemo(() => {
    const total = integrations.length
    const enabled = integrations.filter((x) => x.enabled).length
    const providers = [...new Set(integrations.map((x) => x.provider))]
    return { total, enabled, providers }
  }, [integrations])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">Dashboard</div>
          <div className="mt-1 text-sm text-zinc-500">Your scan pipeline at a glance — triage faster, catch more.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => navigate('/scan')}>Scan an email</Button>
          <Button variant="secondary" onClick={() => navigate('/incidents')}>View incidents</Button>
          <Button variant="ghost" onClick={() => navigate('/integrations')}>Connect inbox</Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total scans" value={stats.total} sub="Last 50 incidents" />
        <StatCard
          label="Malicious"
          value={stats.malicious}
          sub="Flagged as attacks"
          progress={stats.total ? (stats.malicious / stats.total) * 100 : 0}
        />
        <StatCard label="Quarantined" value={stats.quarantined} sub="Auto / manual actions" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent activity" subtitle="Latest incidents and verdicts" />
          <CardContent>
            <div className="space-y-3">
              {incidents.slice(0, 8).map((it) => (
                <button
                  key={it.id}
                  onClick={() => navigate(`/incidents/${it.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left transition hover:bg-white"
                >
                  <div>
                    <div className="text-sm font-semibold">{it.subject || '(no subject)'}</div>
                    <div className="mt-1 text-xs text-zinc-500">{it.sender || '(unknown sender)'} • {it.provider}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={it.verdict === 'malicious' ? 'red' : 'green'}>{it.verdict}</Badge>
                    <Badge tone="neutral">{Math.round(it.risk_score * 100)}%</Badge>
                  </div>
                </button>
              ))}
              {!incidents.length ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="text-sm font-semibold">No scans yet</div>
                  <div className="mt-1 text-sm text-zinc-600">Start by scanning a suspicious email or connecting an inbox for automatic polling.</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => navigate('/scan')}>Scan an email</Button>
                    <Button variant="secondary" onClick={() => navigate('/integrations')}>Connect inbox</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Signals" subtitle="What PhishGuard is seeing in your data" />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={integrationStats.enabled ? 'green' : 'neutral'}>
                {integrationStats.enabled ? `${integrationStats.enabled} enabled integration(s)` : 'No enabled integrations'}
              </Badge>
              <Badge tone="neutral">{integrationStats.total} account(s) connected</Badge>
              {integrationStats.providers.map((p) => (
                <Badge key={p} tone="blue">{p}</Badge>
              ))}
            </div>

            <div>
              <div className="text-sm font-semibold">Top attack types</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {topAttackTypes.length ? (
                  topAttackTypes.map(([k, v]) => (
                    <Badge key={k} tone={k === 'legitimate' ? 'green' : 'yellow'}>
                      {k} • {v}
                    </Badge>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">Not enough data yet. Run a few scans first.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold">Next best actions</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                <li>Connect Gmail or Outlook for continuous scanning</li>
                <li>Label incidents as benign/malicious to improve model accuracy</li>
                <li>Import a CSV dataset in Admin to accelerate training</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => navigate('/integrations')}>Integrations</Button>
                <Button variant="secondary" onClick={() => navigate('/admin')}>Admin</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
