import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { X } from 'lucide-react'

const ToastCtx = createContext(null)

function toneClasses(tone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    default:
      return 'border-zinc-200 bg-white text-zinc-900'
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, tone = 'neutral', duration = 3500 }) => {
      const id = Math.random().toString(36).slice(2)
      const item = { id, title, description, tone, createdAt: Date.now() }
      setToasts((prev) => [item, ...prev].slice(0, 4))
      if (duration && duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss]
  )

  const value = useMemo(() => ({ toast, dismiss, toasts }), [toast, dismiss, toasts])

  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

export function Toaster() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-sm ${toneClasses(t.tone)}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {t.title ? <div className="text-sm font-semibold">{t.title}</div> : null}
              {t.description ? (
                <div className="mt-1 text-sm opacity-80">{t.description}</div>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-lg p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
