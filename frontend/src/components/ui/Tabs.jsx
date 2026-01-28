import React from 'react'

export function Tabs({ value, onValueChange, children, className='' }) {
  return (
    <div className={className} data-tabs="root" data-value={value}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, { value, onValueChange })
      })}
    </div>
  )
}

export function TabsList({ value, onValueChange, children, className='' }) {
  return (
    <div className={`inline-flex rounded-2xl border border-zinc-200 bg-white p-1 ${className}`}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, { value, onValueChange })
      })}
    </div>
  )
}

export function TabsTrigger({ value: current, onValueChange, tabValue, children }) {
  const active = current === tabValue
  return (
    <button
      type="button"
      onClick={() => onValueChange?.(tabValue)}
      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value: current, tabValue, children, className='' }) {
  if (current !== tabValue) return null
  return <div className={className}>{children}</div>
}
