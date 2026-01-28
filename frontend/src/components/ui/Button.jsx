import React from 'react'

export default function Button({
  children,
  variant = 'primary',
  className = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  loading = false,
  disabled,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
    ghost:
      'bg-transparent text-zinc-900 hover:bg-zinc-100 focus:ring-zinc-300 shadow-none',
  }

  const isDisabled = disabled || loading

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${
        isDisabled ? 'cursor-not-allowed opacity-60 hover:opacity-60' : ''
      } ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent"
          aria-label="Loading"
        />
      ) : LeftIcon ? (
        <LeftIcon size={16} />
      ) : null}
      <span>{children}</span>
      {RightIcon ? <RightIcon size={16} /> : null}
    </button>
  )
}
