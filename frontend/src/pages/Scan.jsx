import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, FileUp, ShieldAlert, Trash2 } from 'lucide-react'
import { api } from '../api/client.js'
import Input from '../components/ui/Input.jsx'
import Textarea from '../components/ui/Textarea.jsx'
import Button from '../components/ui/Button.jsx'
import { Card, CardHeader, CardContent } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import TokenEvidence from '../components/TokenEvidence.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function parseEml(text) {
  const parts = text.split(/\r?\n\r?\n/)
  const headerText = parts[0] || ''
  const bodyText = parts.slice(1).join('\n\n').trim()

  // unfold headers (lines starting with whitespace continue previous header)
  const lines = headerText.split(/\r?\n/)
  const unfolded = []
  for (const line of lines) {
    if (/^[\t ]/.test(line) && unfolded.length) {
      unfolded[unfolded.length - 1] += ' ' + line.trim()
    } else {
      unfolded.push(line)
    }
  }

  const get = (name) => {
    const lower = name.toLowerCase() + ':'
    const found = unfolded.find((l) => l.toLowerCase().startsWith(lower))
    if (!found) return ''
    return found.slice(lower.length).trim()
  }

  return {
    subject: get('Subject'),
    sender: get('From'),
    recipients: get('To'),
    body: bodyText,
  }
}

export default function Scan() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mode, setMode] = useState('paste')
  const [subject, setSubject] = useState('')
  const [sender, setSender] = useState('')
  const [recipients, setRecipients] = useState('')
  const [body, setBody] = useState('')
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const riskPct = useMemo(() => (result ? Math.round(result.risk_score * 100) : null), [result])

  const clear = () => {
    setSubject('')
    setSender('')
    setRecipients('')
    setBody('')
    setResult(null)
    setErr('')
  }

  const run = async () => {
    setErr('')
    setLoading(true)
    try {
      const res = await api.scanManual({ subject, sender, recipients, body })
      setResult(res)
      toast({
        title: 'Scan complete',
        description: `Verdict: ${res.verdict} • Risk: ${Math.round(res.risk_score * 100)}%`,
        tone: res.verdict === 'malicious' ? 'warning' : 'success',
      })
    } catch (e) {
      setErr(e.message)
      toast({ title: 'Scan failed', description: e.message, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onUploadEml = async (file) => {
    setErr('')
    try {
      const text = await file.text()
      const parsed = parseEml(text)
      setSubject(parsed.subject)
      setSender(parsed.sender)
      setRecipients(parsed.recipients)
      setBody(parsed.body)
      toast({ title: 'Imported .eml', description: 'Fields were filled from headers + body.', tone: 'success' })
    } catch (e) {
      setErr('Failed to parse .eml')
      toast({ title: 'Import failed', description: 'Could not parse that .eml file.', tone: 'error' })
    }
  }

  const quarantine = async () => {
    if (!result?.scan_id) return
    try {
      await api.quarantine(result.scan_id)
      toast({ title: 'Quarantine executed', description: 'Action sent to backend.', tone: 'success' })
    } catch (e) {
      toast({ title: 'Quarantine failed', description: e.message, tone: 'error' })
    }
  }

  const copyReport = async () => {
    if (!result) return
    const report = {
      scan_id: result.scan_id,
      verdict: result.verdict,
      risk_score: result.risk_score,
      attack_type: result.attack_type,
      subject,
      from: sender,
      to: recipients,
      evidence: result.evidence,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      toast({ title: 'Copied report', description: 'Paste into a ticket or send to your security team.', tone: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard access was blocked by the browser.', tone: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">Scan</div>
          <div className="mt-1 text-sm text-zinc-500">Analyze an email, get a risk score, and export evidence for investigation.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/incidents')}>Go to Incidents</Button>
        </div>
      </div>

      {err ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Email input" subtitle="Paste fields manually or upload a .eml file (recommended)." />
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList>
                <TabsTrigger tabValue="paste">Paste</TabsTrigger>
                <TabsTrigger tabValue="eml">Upload .eml</TabsTrigger>
              </TabsList>

              <TabsContent tabValue="paste" className="mt-4 space-y-4">
                <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Action required: verify your account" />
                <Input label="From" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="e.g., IT Support <it-helpdesk@company.com>" />
                <Input label="To" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="e.g., employee@company.com" />
                <Textarea label="Body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste the email body here…" />
              </TabsContent>

              <TabsContent tabValue="eml" className="mt-4 space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold">Upload a raw email</div>
                  <div className="mt-1 text-sm text-zinc-600">Export an email as <span className="font-mono">.eml</span> and upload it here. We’ll extract Subject/From/To/Body for you.</div>
                  <div className="mt-4">
                    <input
                      type="file"
                      accept=".eml,text/plain"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) onUploadEml(f)
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={18} className="mt-0.5" />
                    <div>
                      <div className="font-semibold">Tip</div>
                      <div className="mt-1">If your .eml is multipart/HTML heavy, the body may be noisy. That’s okay for the MVP — you still get URL and token indicators.</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={run} loading={loading} disabled={!subject && !body} leftIcon={FileUp}>Scan</Button>
              <Button
                variant="secondary"
                onClick={clear}
                leftIcon={Trash2}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Results" subtitle="Risk score, attack type, and evidence." />
          <CardContent>
            {!result ? (
              <div className="text-sm text-zinc-500">Run a scan to see results.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={result.verdict === 'malicious' ? 'red' : 'green'}>{result.verdict}</Badge>
                  <Badge tone="neutral">{riskPct}% risk</Badge>
                  <Badge tone="blue">{result.attack_type}</Badge>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold">Recommended action</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {result.verdict === 'malicious'
                      ? riskPct >= 85
                        ? 'High confidence phishing. Quarantine and open an incident.'
                        : 'Suspicious. Investigate evidence and consider quarantining.'
                      : 'Looks benign. If this is a false negative, mark it in Incidents to improve the model.'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={copyReport} leftIcon={Copy}>Copy report</Button>
                    <Button variant="secondary" onClick={() => navigate(`/incidents/${result.scan_id}`)}>Open incident</Button>
                    {result.verdict === 'malicious' ? (
                      <Button variant="danger" onClick={quarantine}>Quarantine</Button>
                    ) : null}
                  </div>
                </div>

                <TokenEvidence evidence={result.evidence} />

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  <div className="font-semibold">Scan ID</div>
                  <div className="mt-1 text-zinc-600">{result.scan_id}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
