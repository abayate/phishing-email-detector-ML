# Phishing Email Detector (ML) — PhishGuard MVP

A full-stack **phishing/spam detection MVP** that combines:
- **FastAPI backend** (scanning, incidents, feedback, integrations stubs)
- **React frontend** (modern dashboard UI)
- A simple **ML pipeline** (train → inference → feedback/continuous learning loop)

Built to demonstrate how a small business could run a **final-pass email security scanner** and generate **evidence-based** incident reports for a security team.

---

## Features

### Detection & Evidence
- Classifies email content as **malicious vs benign** (phishing/spam vs normal)
- Produces a **confidence score**
- Extracts **evidence/indicators** (e.g., suspicious tokens, URLs, risky language patterns)

### Incident Workflow
- Creates an **incident record** per scan
- Supports basic **triage actions** (e.g., mark benign/malicious, quarantine/allow decisions depending on configuration)

### Continuous Learning (MVP)
- Collects user feedback (false positives/false negatives)
- Enables retraining from accumulated labeled data (admin workflow)

### Integrations (MVP scaffolding)
- Gmail / Outlook connectors are included as **extensible stubs** (intended for future expansion)

---

## Tech Stack

**Backend**
- Python 3.12
- FastAPI + Uvicorn
- scikit-learn (TF-IDF + classic ML baseline)
- pandas (training data)
- BeautifulSoup4 + lxml (HTML stripping/normalization)
- SQLite (incidents/feedback storage)
- cryptography (token/secret handling)

**Frontend**
- React + Vite
- Tailwind CSS
- Component-based UI layout (dashboard / sidebar / pages)

---

## Repo Structure

```
phishing-email-detector-ML/
├── backend/                 FastAPI service
│   ├── app/
│   │   ├── main.py          app + router wiring, /health
│   │   ├── routes/          scan, incidents, feedback, actions, admin, integrations
│   │   ├── ml/              training, inference, online learning, model storage
│   │   └── email/           Gmail / Outlook provider stubs
│   ├── data/sample_train.csv  tiny demo dataset (text,label)
│   └── .env.example
└── frontend/                React + Vite + Tailwind dashboard
    └── src/pages/           Dashboard, Incidents, Integrations, Admin
```

---

## How it works

```
email text ──▶ HTML strip + normalize ──▶ TF-IDF ──▶ SGDClassifier (log loss) ──▶ risk score 0–1
                                                                                     │
                       rule-based indicators (urgency, credential asks, URLs) ───────┤
                                                                                     ▼
                                 verdict + attack type + evidence ──▶ incident record (SQLite)
                                                                                     │
                                         analyst feedback ──▶ /admin/retrain ◀──────┘
```

Emails scoring above `RISK_THRESHOLD` (default `0.78`) are flagged malicious.

---

## Quick start

**Requirements:** Python 3.12 (the pinned packages do not build on 3.13+), Node 18+

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
python -m app.training train --csv data/sample_train.csv --out ./phishing_model
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### Try a scan
```bash
curl -X POST http://localhost:8000/scan/manual \
  -H "X-API-Key: dev-key-change-me" -H "Content-Type: application/json" \
  -d '{"subject":"Urgent: verify your account","sender":"security@paypa1.com","body":"Your account is suspended. Click http://bit.ly/x to verify your password now."}'
```
Actual response (trimmed):
```json
{
  "risk_score": 0.995,
  "verdict": "malicious",
  "attack_type": "Credential Phishing",
  "evidence": {
    "urls": ["http://bit.ly/x"],
    "indicators": ["Asks to verify account", "Mentions credentials/OTP", "Creates urgency"]
  }
}
```

---

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/scan/manual` | Scan subject / sender / body |
| `POST` | `/scan/eml` | Scan an uploaded `.eml` file |
| `GET` | `/incidents` · `/incidents/{id}` | Incident list and details |
| `POST` | `/feedback` | Mark a verdict as a false positive or false negative |
| `POST` | `/actions/quarantine/{id}` | Quarantine action |
| `POST` | `/admin/import` · `/admin/retrain` | Import a labeled CSV and retrain |

All endpoints except `/health` and the OAuth callbacks require the `X-API-Key` header.

---

## Limitations and roadmap

- The included `sample_train.csv` has only 9 rows, enough to run the demo. For real accuracy, import a public
  corpus (for example, a Kaggle phishing email dataset) through `/admin/import`, then report precision, recall, and F1.
- Gmail and Outlook connectors are stubs.
- Next: a held-out evaluation script, a confusion matrix in the Admin page, and Docker Compose for one-command setup.
