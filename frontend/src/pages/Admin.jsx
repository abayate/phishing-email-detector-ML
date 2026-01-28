import React, { useState } from 'react'
import { Upload, Wand2 } from 'lucide-react'
import { api } from '../api/client.js'
import { Card, CardHeader, CardContent } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useToast } from '../components/ui/Toast.jsx'

export default function Admin() {
  const { toast } = useToast()
  const [file, setFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [loadingImport, setLoadingImport] = useState(false)
  const [loadingTrain, setLoadingTrain] = useState(false)
  const [err, setErr] = useState('')

  const doImport = async () => {
    if (!file) return
    setErr('')
    setLoadingImport(true)
    try {
      const res = await api.importCsv(file)
      setImportResult(res)
      toast({ title: 'Import complete', description: `${res.inserted_rows} row(s) inserted.`, tone: 'success' })
    } catch (e) {
      setErr(e.message)
      toast({ title: 'Import failed', description: e.message, tone: 'error' })
    } finally {
      setLoadingImport(false)
    }
  }

  const retrain = async () => {
    setErr('')
    setLoadingTrain(true)
    try {
      const res = await api.retrain()
      toast({ title: 'Retraining started', description: `New model saved at ${res.model_dir}`, tone: 'success', duration: 4500 })
    } catch (e) {
      setErr(e.message)
      toast({ title: 'Retrain failed', description: e.message, tone: 'error' })
    } finally {
      setLoadingTrain(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Admin</div>
        <div className="mt-1 text-sm text-zinc-500">Manage training data and trigger model retraining (MVP).</div>
      </div>

      {err ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Import training CSV" subtitle="Add labeled examples so the global model learns more scenarios." />
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <div className="font-semibold">CSV format</div>
              <div className="mt-1">Your CSV must include these headers:</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">text</Badge>
                <Badge tone="neutral">label</Badge>
                <Badge tone="neutral">attack_type</Badge>
              </div>
              <div className="mt-2 text-xs text-zinc-500">label: 0 = benign, 1 = malicious. attack_type: e.g., credential_harvest, invoice_fraud, malware, b... etc.</div>
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <div className="flex flex-wrap gap-2">
              <Button leftIcon={Upload} loading={loadingImport} disabled={!file} onClick={doImport}>Import</Button>
              {file ? <div className="text-sm text-zinc-500 self-center">Selected: {file.name}</div> : null}
            </div>

            {importResult ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
                <div className="font-semibold">Last import</div>
                <div className="mt-2">Inserted rows: <span className="font-semibold">{importResult.inserted_rows}</span></div>
                <div className="mt-1 text-zinc-600">You can now retrain the model to incorporate the new data.</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Retrain model" subtitle="Rebuild the classifier from accumulated labeled data." />
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <div className="font-semibold">What happens on retrain?</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Backend pulls stored examples from SQLite.</li>
                <li>Trains a TF‑IDF + linear classifier.</li>
                <li>Writes a new model to disk and switches inference to it.</li>
              </ul>
              <div className="mt-2 text-xs text-zinc-500">In a scaled version, you would run this in a job queue (Celery/Redis) and deploy the model through CI/CD.</div>
            </div>

            <Button leftIcon={Wand2} loading={loadingTrain} onClick={retrain}>Retrain now</Button>

            <div className="text-sm text-zinc-500">If retrain errors, confirm your Python version and dependencies on the backend.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
