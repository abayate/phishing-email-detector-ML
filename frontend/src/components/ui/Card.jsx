import React from 'react'

export function Card({ children, className='' }) {
  return <div className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${className}`}>{children}</div>
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
      <div>
        <div className="text-base font-semibold">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-zinc-500">{subtitle}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  )
}

export function CardContent({ children, className='' }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}
