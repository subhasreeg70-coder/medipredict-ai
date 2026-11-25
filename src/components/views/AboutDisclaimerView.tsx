import { useState } from 'react';
import { Check, Copy, Layers, Lock, ShieldAlert, Terminal } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const PYTHON_SNIPPET = `# python_backend/app.py (Included in workspace)
# Install: pip install -r python_backend/requirements.txt
# Run:     uvicorn app:app --reload --port 8000

import joblib
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

@app.post("/api/predict/heart")
def predict_heart(payload: dict):
    model = joblib.load("saved_models/heart_pipeline.joblib")
    # Vectorize ordered UCI features, return class & probability
    ...`;

export function AboutDisclaimerView() {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PYTHON_SNIPPET);
      setCopied(true);
      showToast({
        title: 'Snippet copied',
        description: 'Python FastAPI + Scikit-learn snippet copied to clipboard.',
        variant: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({
        title: 'Clipboard unavailable',
        description: 'Select and copy the snippet manually.',
        variant: 'warning',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Medical Disclaimer */}
      <section className="rounded-2xl border border-violet-200 dark:border-violet-800/70 bg-violet-50/40 dark:bg-violet-950/30 p-6 sm:p-8 mp-glow-hover">
        <div className="flex items-start gap-3.5">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-violet-700 dark:text-violet-400" />
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Medical Disclaimer & Educational Scope
            </h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
              MEDIPREDICT AI is strictly an educational machine learning demonstration platform. It
              is <span className="font-semibold text-slate-900 dark:text-slate-100">not</span> a
              cleared medical device,{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">not</span>{' '}
              validated for clinical decision-making, and{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">not</span> a
              substitute for evaluation by a qualified healthcare professional.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
              <li>
                Built-in demonstration predictions use transparent illustrative scoring formulas so
                students can observe feature sensitivity—they are not trained clinical models.
              </li>
              <li>
                Model Performance metrics remain marked as{' '}
                <span className="font-mono text-xs bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-700">
                  Pending
                </span>{' '}
                until an external Scikit-learn evaluation endpoint is connected.
              </li>
              <li>
                Do not submit real patient names, medical record numbers, or protected health
                information (PHI) anywhere in this application.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture Principles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 space-y-4 mp-glow-hover">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Separated Disease Architecture
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Each disease domain is organized into an isolated module containing its own schema
            definitions, synthetic sample records, and estimator adapter:
          </p>
          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200 font-mono bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-700 p-4">
            <div>src/modules/heart/ · 13 features · /api/predict/heart</div>
            <div>src/modules/diabetes/ · 8 features · /api/predict/diabetes</div>
            <div>src/modules/breastCancer/ · 10 features · /api/predict/breast-cancer</div>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2">
            <Lock className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
            <span>
              Authenticated user accounts isolate saved prediction histories per user inside
              Firestore security boundaries.
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 space-y-4 mp-glow-hover">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Connecting Python Scikit-learn
              </h3>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 mp-btn-glow transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Snippet
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Train separate Scikit-learn pipelines in Python, export them with{' '}
            <span className="font-mono text-xs">joblib.dump()</span>, and launch{' '}
            <span className="font-mono text-xs">python_backend/app.py</span>. Then switch the mode
            in Model Performance to <span className="font-semibold">Scikit-learn API</span>.
          </p>
          <pre className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 p-4 font-mono text-[11px] text-slate-100 leading-relaxed">
            {PYTHON_SNIPPET}
          </pre>
        </section>
      </div>
    </div>
  );
}
