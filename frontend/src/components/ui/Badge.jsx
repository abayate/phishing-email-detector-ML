import React from 'react'

export default function Badge({ children, tone='neutral' }) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-700',
    green: 'bg-emerald-100 text-emerald-800',
    yellow: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  )
}
