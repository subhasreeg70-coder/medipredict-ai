# MEDIPREDICT AI — Educational Healthcare ML Workspace

MEDIPREDICT AI is an educational machine learning dashboard built with React, TypeScript, Tailwind CSS, Three.js, FastAPI, Scikit-learn, and Firebase. It demonstrates tabular binary classification workflows across three isolated public datasets:

- **Heart Disease** — UCI Cleveland Heart Disease Dataset (`303` rows, `13` features)
- **Diabetes** — Pima Indians Diabetes Dataset (`768` rows, `8` features)
- **Breast Cancer** — Wisconsin Diagnostic Breast Cancer (WDBC) Dataset (`569` rows, `10` mean nuclei features)

> **Educational Disclaimer:** All predictions, risk tiers, and visualizations are strictly for educational ML demonstration using synthetic or public benchmark inputs. This software is not a clinical tool and must not be used for medical diagnosis or treatment.

---

## Architecture Overview

- **Frontend (`src/`)**: React 19 + Vite + TypeScript + Tailwind CSS v4 + Chart.js + Three.js (`Dark` / `Light` theme support persisted in `localStorage` under `medipredict_theme`).
- **ML Inference & Evaluation Backend (`python_backend/`)**: FastAPI (`python_backend/app.py`) serving three isolated Scikit-learn pipelines (`SimpleImputer` + `StandardScaler` + `LogisticRegression`) trained strictly on stratified 80/20 splits in `python_backend/train_models.py`.
- **Authentication & Persistence (`src/firebase.ts`, `firestore.rules`, `firestore.indexes.json`)**:
  - Firebase Google Sign-In (`email_verified == true` enforced in client policy and Firestore rules).
  - Per-user prediction history isolation under `/users/{userId}/predictions/{predictionId}`.
  - User-owned feedback submission/listing under `/feedback/{feedbackId}` and fail-closed admin moderation requiring trusted server-issued Firebase custom claims (`request.auth.token.admin == true`).

---

## Quick Start (Local Development)

### 1. Python FastAPI Backend

```bash
python3 -m venv python_backend/.venv
source python_backend/.venv/bin/activate
pip install -r python_backend/requirements.txt

# Optional: re-train pipelines from datasets and regenerate saved_models/
python python_backend/train_models.py

# Start FastAPI on port 8001
uvicorn app:app --app-dir python_backend --host 127.0.0.1 --port 8001
```

### 2. Frontend Vite Server

```bash
npm install
npm run dev
```

Vite runs on `http://localhost:3000` and proxies `/api` and `/health` requests to `VITE_DEV_PROXY_TARGET` (default `http://127.0.0.1:8001`). See `.env.example` for environment variable configuration.

---

## Verification Commands

```bash
# Python backend & model integrity tests
python_backend/.venv/bin/python3 -m pytest -v python_backend/tests/test_ml_backend.py

# Auth policy, ownership & static Firestore rules tests
npx tsx --test tests/authSecurity.test.mjs

# TypeScript typecheck & Firestore rules ESLint
npm run lint
npx eslint firestore.rules

# Production build
npm run build
```

---

## Deployment & Firebase Setup

See **`DEPLOYMENT.md`** for manual Firestore composite index deployment instructions, Firebase Admin SDK custom-claim provisioning, and FastAPI security/rate-limiting operational notes.
