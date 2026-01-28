import React from 'react'

export default function Input({
  label,
  hint,
  error,
  leftIcon: LeftIcon,
  right,
  className = '',
  ...props
}) {
  return (
    <label className="block">
      {label ? <div className="mb-2 text-sm font-medium text-zinc-700">{label}</div> : null}
      <div className="relative">
        {LeftIcon ? (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <LeftIcon size={16} />
          </div>
        ) : null}
        <input
          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
          } ${LeftIcon ? 'pl-10' : ''} ${right ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {right ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div> : null}
      </div>
      {error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null}
      {hint && !error ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </label>
  )
}
