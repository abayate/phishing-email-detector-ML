import React from 'react'

export default function Select({ label, hint, error, className='', children, ...props }) {
  return (
    <label className="block">
      {label ? <div className="mb-2 text-sm font-medium text-zinc-700">{label}</div> : null}
      <select
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null}
      {hint && !error ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </label>
  )
}
