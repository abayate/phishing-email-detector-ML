import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="py-10">
      <Card className="mx-auto max-w-xl">
        <CardHeader title="Page not found" subtitle="That route doesn’t exist in the PhishGuard UI." />
        <CardContent className="flex flex-col gap-4">
          <div className="text-sm text-zinc-600">
            Try going back to the dashboard.
          </div>
          <Link to="/">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
