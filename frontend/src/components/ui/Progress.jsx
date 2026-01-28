import React from 'react'

export default function Progress({ value }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full rounded-full bg-zinc-100">
      <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
    </div>
  )
}
