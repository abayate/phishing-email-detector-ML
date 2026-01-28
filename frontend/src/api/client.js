const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key-change-me'

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.detail || data?.error || `Request failed: ${res.status}`
    throw new Error(msg)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  scanManual: (payload) => request('/scan/manual', { method: 'POST', body: JSON.stringify(payload) }),
  incidents: () => request('/incidents?limit=50'),
  incident: (id) => request(`/incidents/${id}`),
  feedback: (payload) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  integrations: () => request('/integrations'),
  connectIntegration: (provider) => request(`/integrations/${provider}/connect`, { method: 'POST' }),
  toggleIntegration: (id, enabled) => request(`/integrations/${id}/toggle?enabled=${enabled}`, { method: 'POST' }),
  quarantine: (scanId) => request(`/actions/quarantine/${scanId}`, { method: 'POST' }),
  adminImport: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/admin/import`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.detail || 'Import failed')
    return data
  },
  adminRetrain: () => request('/admin/retrain', { method: 'POST' }),
}
