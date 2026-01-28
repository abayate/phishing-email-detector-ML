import React from 'react'
import Badge from './ui/Badge.jsx'

export default function TokenEvidence({ evidence }) {
  const tokens = evidence?.top_tokens || []
  const urls = evidence?.urls || []
  const indicators = evidence?.indicators || []
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Why it was flagged</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {indicators.length ? indicators.map((i, idx) => <Badge key={idx} tone="yellow">{i}</Badge>) : <span className="text-sm text-zinc-500">No heuristic indicators.</span>}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold">Top contributing tokens</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tokens.length ? tokens.map((t, idx) => (
            <Badge key={idx} tone="blue">{t.token}</Badge>
          )) : <span className="text-sm text-zinc-500">No token explanations available.</span>}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold">Extracted URLs</div>
        <div className="mt-2 space-y-2">
          {urls.length ? urls.map((u, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
              {u}
            </div>
          )) : <span className="text-sm text-zinc-500">No URLs detected.</span>}
        </div>
      </div>
    </div>
  )
}
