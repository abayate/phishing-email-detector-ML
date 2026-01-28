import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Filter, RefreshCw, ShieldAlert } from 'lucide-react'
import { api } from '../api/client.js'
import { Card, CardHeader, CardContent } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import TokenEvidence from '../components/TokenEvidence.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function fmtPct(x) {
  return `${Math.round((x || 0) * 100)}%`
}

export default function Incidents() {
  const navigate = useNavigate()
  const { id } = useParams()
  const selectedId = id ? String(id) : null
  const { toast } = useToast()

  const [rows, setRows] = useState([])
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [query, setQuery] = useState('')
  const [verdict, setVerdict] = useState('all')
  const [sort, setSort] = useState('newest')

  const refresh = async () => {
    setErr('')
    try {
      const r = await api.incidents()
      setRows(r)
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let mounted = true
    ;(async () => {
      setLoadingDetail(true)
      setErr('')
      try {
        const d = await api.incident(selectedId)
        if (mounted) setDetail(d)
      } catch (e) {
        if (mounted) setErr(e.message)
      } finally {
        if (mounted) setLoadingDetail(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [selectedId])

  const filtered = useMemo(() => {
    let r = rows
    if (verdict !== 'all') r = r.filter((x) => x.verdict === verdict)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter((x) => (x.subject || '').toLowerCase().includes(q) || (x.sender || '').toLowerCase().includes(q))
    }
    if (sort === 'risk') {
      r = [...r].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    } else {
      // assume higher id is newer in MVP
      r = [...r].sort((a, b) => String(b.id).localeCompare(String(a.id)))
    }
    return r
  }, [rows, query, verdict, sort])

  const open = (scanId) => navigate(`/incidents/${scanId}`)
  const close = () => navigate('/incidents')

  const mark = async (label) => {
    if (!selectedId) return
    try {
      await api.feedback({ scan_id: selectedId, correct_label: label, notes: label ? 'confirmed malicious' : 'confirmed benign' })
      toast({ title: 'Feedback submitted', description: label ? 'Marked malicious.' : 'Marked benign.', tone: 'success' })
      await refresh()
    } catch (e) {
      toast({ title: 'Feedback failed', description: e.message, tone: 'error' })
    }
  }

  const quarantine = async () => {
    if (!selectedId) return
    try {
      await api.quarantine(selectedId)
      toast({ title: 'Quarantine executed', description: 'Action sent to backend.', tone: 'success' })
      await refresh()
      if (detail) setDetail({ ...detail, quarantined: true })
    } catch (e) {
      toast({ title: 'Quarantine failed', description: e.message, tone: 'error' })
    }
  }

  const copyIncident = async () => {
    if (!detail) return
    const report = {
      id: detail.id,
      verdict: detail.verdict,
      risk_score: detail.risk_score,
      attack_type: detail.attack_type,
      provider: detail.provider,
      subject: detail.subject,
      sender: detail.sender,
      quarantined: detail.quarantined,
      evidence: detail.evidence,
      body_preview: detail.body_preview,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      toast({ title: 'Copied incident', description: 'Paste into a ticket or share with your SOC.', tone: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard access was blocked by the browser.', tone: 'error' })
    }
  }

  const showListOnlyOnMobile = !!selectedId

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">Incidents</div>
          <div className="mt-1 text-sm text-zinc-500">Investigate flagged emails and label outcomes to improve the model.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leftIcon={RefreshCw} onClick={refresh}>Refresh</Button>
          <Button variant="primary" onClick={() => navigate('/scan')}>New scan</Button>
        </div>
      </div>

      {err ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={showListOnlyOnMobile ? 'lg:block hidden' : ''}>
          <CardHeader
            title="Queue"
            subtitle={`${filtered.length} result(s)`}
            right={
              <div className="hidden lg:flex gap-2">
                <Badge tone="neutral">Filters</Badge>
              </div>
            }
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="subject or sender"
                leftIcon={Filter}
              />
              <Select label="Verdict" value={verdict} onChange={(e) => setVerdict(e.target.value)}>
                <option value="all">All</option>
                <option value="malicious">Malicious</option>
                <option value="benign">Benign</option>
              </Select>
              <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="risk">Highest risk</option>
              </Select>
            </div>

            <div className="space-y-2">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => open(r.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-white ${
                    selectedId === String(r.id) ? 'border-zinc-400 bg-white' : 'border-zinc-200 bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{r.subject || '(no subject)'}</div>
                      <div className="mt-1 text-xs text-zinc-500">{r.sender || '(unknown)'} • {r.provider}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone={r.verdict === 'malicious' ? 'red' : 'green'}>{r.verdict}</Badge>
                        <Badge tone="neutral">{fmtPct(r.risk_score)}</Badge>
                        {r.attack_type ? <Badge tone="blue">{r.attack_type}</Badge> : null}
                        {r.quarantined ? <Badge tone="yellow">quarantined</Badge> : null}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-zinc-300" style={{ width: 8, height: 8, opacity: Math.min(1, Math.max(0.2, r.risk_score || 0)) }} />
                    </div>
                  </div>
                </button>
              ))}
              {!filtered.length ? <div className="text-sm text-zinc-500">No scans match your filters.</div> : null}
            </div>
          </CardContent>
        </Card>

        <Card className={showListOnlyOnMobile ? '' : ''}>
          <CardHeader
            title="Incident details"
            subtitle={selectedId ? `Scan #${selectedId}` : 'Select an incident to view evidence.'}
            right={selectedId ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={copyIncident} leftIcon={Copy}>Copy</Button>
                <Button variant="secondary" onClick={() => mark(0)}>Mark benign</Button>
                <Button variant="secondary" onClick={() => mark(1)}>Mark malicious</Button>
                <Button variant="danger" onClick={quarantine}>Quarantine</Button>
              </div>
            ) : null}
          />
          <CardContent>
            {selectedId ? (
              <div className="mb-4 lg:hidden">
                <Button variant="ghost" leftIcon={ArrowLeft} onClick={close}>Back to queue</Button>
              </div>
            ) : null}

            {loadingDetail ? <div className="text-sm text-zinc-500">Loading…</div> : null}
            {!selectedId ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={18} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">Pick an incident</div>
                    <div className="mt-1 text-sm text-zinc-600">Select a scan from the queue to view evidence, then take action.</div>
                  </div>
                </div>
              </div>
            ) : null}

            {detail ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={detail.verdict === 'malicious' ? 'red' : 'green'}>{detail.verdict}</Badge>
                  <Badge tone="neutral">{fmtPct(detail.risk_score)} risk</Badge>
                  <Badge tone="blue">{detail.attack_type}</Badge>
                  {detail.quarantined ? <Badge tone="yellow">quarantined</Badge> : null}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  <div className="font-semibold">Preview</div>
                  <div className="mt-2 whitespace-pre-wrap text-zinc-700">{detail.body_preview}</div>
                </div>

                <TokenEvidence evidence={detail.evidence} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
