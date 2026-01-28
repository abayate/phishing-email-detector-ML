import React from 'react'
import { Card, CardContent } from './ui/Card.jsx'
import Progress from './ui/Progress.jsx'

export default function StatCard({ label, value, sub, progress }) {
  return (
    <Card>
      <CardContent>
        <div className="text-xs font-medium text-zinc-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {sub ? <div className="mt-1 text-sm text-zinc-500">{sub}</div> : null}
        {typeof progress === 'number' ? <div className="mt-4"><Progress value={progress} /></div> : null}
      </CardContent>
    </Card>
  )
}
