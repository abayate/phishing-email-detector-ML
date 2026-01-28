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

