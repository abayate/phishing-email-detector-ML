import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { api } from '../api/client.js'
import { Card, CardHeader, CardContent } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useToast } from '../components/ui/Toast.jsx'

export default function Integrations() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setErr('')
    setLoading(true)
    try {
      const a = await api.integrations()
      setAccounts(a)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const connect = async (provider) => {
    setErr('')
    try {
      const { auth_url } = await api.connectIntegration(provider)
      window.open(auth_url, '_blank')
      toast({
        title: 'OAuth started',
        description: 'Complete consent in the new tab, then come back and click Refresh.',
        tone: 'success',
        duration: 4500,
      })
    } catch (e) {
      setErr(e.message)
      toast({ title: 'Connect failed', description: e.message, tone: 'error' })
    }
  }

  const toggle = async (id, enabled) => {
    try {
      await api.toggleIntegration(id, enabled)
      await refresh()
      toast({ title: 'Updated', description: enabled ? 'Polling enabled.' : 'Polling disabled.', tone: 'success' })
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, tone: 'error' })
    }
  }

  const stats = useMemo(() => {
    const total = accounts.length
    const enabled = accounts.filter((a) => a.enabled).length
    const providers = [...new Set(accounts.map((a) => a.provider))]
    return { total, enabled, providers }
  }, [accounts])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Integrations</div>
        <div className="mt-1 text-sm text-zinc-500">Connect Gmail or Outlook so PhishGuard can scan inbound mail automatically.</div>
      </div>

      {err ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Connect providers"
            subtitle="OAuth is required. Backend .env must contain your provider credentials."
            right={
              <Button variant="secondary" leftIcon={RefreshCw} loading={loading} onClick={refresh}>
                Refresh
              </Button>
            }
          />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => connect('gmail')}>Connect Gmail</Button>
              <Button variant="secondary" onClick={() => connect('outlook')}>Connect Outlook</Button>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <div className="font-semibold">How it works</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Click a provider to start OAuth (opens a new tab).</li>
                <li>Approve access, then return here.</li>
                <li>Click Refresh, then Enable polling for the account.</li>
              </ol>
              <div className="mt-3 text-xs text-zinc-500">Tip: In Gmail you can export a message as .eml and also use the manual Scan page.</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Connected accounts" subtitle="Enable/disable inbox polling." />
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone={stats.enabled ? 'green' : 'neutral'}>{stats.enabled} enabled</Badge>
              <Badge tone="neutral">{stats.total} connected</Badge>
              {stats.providers.map((p) => <Badge key={p} tone="blue">{p}</Badge>)}
            </div>

            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold">{a.email}</div>
                    <div className="mt-1 text-xs text-zinc-500">{a.provider} • added {new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.enabled ? 'green' : 'neutral'}>{a.enabled ? 'enabled' : 'disabled'}</Badge>
                    <Button variant="secondary" onClick={() => toggle(a.id, !a.enabled)}>
                      {a.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <a
                      className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      href={a.provider === 'gmail' ? 'https://mail.google.com' : 'https://outlook.office.com/mail/'}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open inbox <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
              {!accounts.length ? <div className="text-sm text-zinc-500">No accounts connected yet.</div> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
