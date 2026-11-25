import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useNavigationTransition } from '../../context/NavigationTransitionContext';
import { useToast } from '../../context/ToastContext';
import { DISEASE_MODULES } from '../../modules/registry';
import { deleteUserPrediction, saveUserPrediction } from '../../services/firestoreService';
import {
  BackendConnectionConfig,
  checkBackendHealth,
  executeDiseasePrediction,
} from '../../services/mlClient';
import { DiseaseId, PredictionResult, SyntheticPrefillPayload } from '../../types/ml';
import { FeatureContributionChart } from '../charts/FeatureContributionChart';
import { EducationalNotice } from '../common/EducationalNotice';
import { LoadingSpinner } from '../common/LoadingIndicator';
import { AnimatedCounter } from '../interactive/AnimatedCounter';
import { MagneticButton } from '../interactive/MagneticButton';
import { TiltCard } from '../interactive/TiltCard';

interface DiseasePredictionViewProps {
  diseaseId: DiseaseId;
  backendConfig: BackendConnectionConfig;
  onOpenAuthModal: () => void;
  prefillPayload?: SyntheticPrefillPayload | null;
  onRecordSyntheticRun?: (
    diseaseId: DiseaseId,
    inputs: Record<string, number>,
    result: PredictionResult,
    profileName: string
  ) => void;
}

export function DiseasePredictionView({
  diseaseId,
  backendConfig,
  onOpenAuthModal,
  prefillPayload,
  onRecordSyntheticRun,
}: DiseasePredictionViewProps) {
  const module = DISEASE_MODULES[diseaseId];
  const { user, predictions } = useAuth();
  const { zoomOutToDashboard } = useNavigationTransition();
  const { showToast } = useToast();

  const initialValues = useMemo(() => {
    const defaults: Record<string, number> = {};
    module.features.forEach((f) => {
      defaults[f.key] = f.defaultValue;
    });
    return defaults;
  }, [module]);

  const [inputs, setInputs] = useState<Record<string, number>>(initialValues);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showJsonPayload, setShowJsonPayload] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'unavailable'>(
    backendConfig.mode === 'sklearn_api' ? 'checking' : 'connected'
  );
  const [backendStatusMessage, setBackendStatusMessage] = useState<string | null>(null);

  const verifyBackend = useCallback(async () => {
    if (backendConfig.mode !== 'sklearn_api') {
      setBackendStatus('connected');
      setBackendStatusMessage(null);
      return;
    }
    setBackendStatus('checking');
    setBackendStatusMessage(null);
    try {
      const health = await checkBackendHealth(backendConfig);
      if (!health.loadedModels.includes(diseaseId)) {
        setBackendStatus('unavailable');
        setBackendStatusMessage(
          `FastAPI connected, but trained '${diseaseId}' model artifact is missing. Run python_backend/train_models.py.`
        );
        return;
      }
      setBackendStatus('connected');
      setBackendStatusMessage(null);
    } catch (err) {
      setBackendStatus('unavailable');
      setBackendStatusMessage(
        err instanceof Error
          ? err.message
          : 'FastAPI ML backend is unavailable. Start python_backend/app.py.'
      );
    }
  }, [backendConfig, diseaseId]);

  useEffect(() => {
    void verifyBackend();
  }, [verifyBackend]);

  useEffect(() => {
    if (prefillPayload && prefillPayload.diseaseId === diseaseId) {
      setInputs({ ...initialValues, ...prefillPayload.inputs });
      setResult(null);
      setErrorMsg(null);
      setSaveMessage(null);
      showToast({
        title: `Loaded ${prefillPayload.label}`,
        description: `Pre-filled ${module.metadata.shortTitle} parameters from synthetic workspace.`,
        variant: 'info',
      });
      return;
    }

    setInputs(initialValues);
    setResult(null);
    setErrorMsg(null);
    setSaveMessage(null);
  }, [diseaseId, initialValues, prefillPayload]);

  const diseaseHistory = useMemo(
    () => predictions.filter((p) => p.diseaseId === diseaseId),
    [predictions, diseaseId]
  );

  const handleFieldChange = (key: string, rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isNaN(parsed)) {
      setInputs((prev) => ({ ...prev, [key]: parsed }));
    }
  };

  const applyPreset = (presetValues: Record<string, number>, presetName?: string) => {
    setInputs({ ...presetValues });
    setResult(null);
    setSaveMessage(null);
    setErrorMsg(null);
    if (presetName) {
      showToast({
        title: `Loaded ${presetName}`,
        description: `${module.metadata.shortTitle} input parameters updated.`,
        variant: 'info',
      });
    }
  };

  const handleReset = () => {
    setInputs(initialValues);
    setResult(null);
    setSaveMessage(null);
    setErrorMsg(null);
    showToast({
      title: 'Parameters reset',
      description: `${module.metadata.shortTitle} inputs restored to defaults.`,
      variant: 'info',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setErrorMsg(null);
    setSaveMessage(null);

    try {
      const prediction = await executeDiseasePrediction(diseaseId, inputs, backendConfig);
      setResult(prediction);
      if (backendConfig.mode === 'sklearn_api') {
        setBackendStatus('connected');
        setBackendStatusMessage(null);
      }

      onRecordSyntheticRun?.(
        diseaseId,
        inputs,
        prediction,
        prediction.isTrainedModel ? 'Scikit-learn API Run' : 'Custom Simulation Run'
      );

      if (user && user.emailVerified) {
        await saveUserPrediction(user.uid, prediction, inputs);
        setSaveMessage('Saved to your private account history.');
        showToast({
          title: `${module.metadata.shortTitle} prediction complete`,
          description: 'Result saved to your private account history.',
          variant: 'success',
        });
      } else {
        showToast({
          title: `${module.metadata.shortTitle} prediction complete`,
          description: `${prediction.isTrainedModel ? 'Model' : 'Demo'} probability: ${(prediction.probability * 100).toFixed(1)}%`,
          variant: 'success',
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'FastAPI ML backend unavailable.';
      setResult(null);
      setErrorMsg(msg);
      if (backendConfig.mode === 'sklearn_api') {
        setBackendStatus('unavailable');
        setBackendStatusMessage(msg);
      }
      showToast({
        title: 'Backend Unavailable / Prediction Failed',
        description: msg,
        variant: 'warning',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteHistory = async (uid: string, itemId: string) => {
    await deleteUserPrediction(uid, itemId);
    showToast({
      title: 'History entry deleted',
      description: 'Removed saved simulation from your account.',
      variant: 'info',
    });
  };

  return (
    <div className="space-y-6">
      <EducationalNotice compact />

      {/* Shared-Element Module Header Hero */}
      <TiltCard
        layoutId={`module-card-${diseaseId}`}
        maxTilt={2}
        ripple={false}
        className="rounded-2xl border border-slate-200/90 dark:border-cyan-500/25 p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-blue-700 dark:text-cyan-400">
              <button
                type="button"
                onClick={(e) => zoomOutToDashboard(e.currentTarget)}
                className="inline-flex items-center gap-1 rounded-md border border-cyan-300/60 dark:border-cyan-500/35 bg-cyan-50/70 dark:bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 mp-btn-glow"
              >
                <ArrowLeft className="h-3 w-3" />
                Zoom Out
              </button>
              <span>
                {module.metadata.referenceSource} · {module.metadata.featureCount} Features
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {module.metadata.title}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {module.metadata.overview}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {module.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.values, preset.name)}
                title={preset.description}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-cyan-500/30 bg-blue-50/70 dark:bg-cyan-950/35 px-3 py-2 text-xs font-medium text-blue-800 dark:text-cyan-300 hover:bg-blue-100 dark:hover:bg-cyan-900/50 mp-btn-glow transition-all whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
                {preset.name}
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 mp-btn-glow transition-all whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              Reset
            </button>
          </div>
        </div>
      </TiltCard>

      {backendConfig.mode === 'sklearn_api' && backendStatus === 'unavailable' && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/90 dark:bg-amber-950/45 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <div className="font-semibold">
                Python Scikit-learn Backend Unavailable (No Demo Fallback)
              </div>
              <div className="mt-0.5 text-amber-800 dark:text-amber-300">
                {backendStatusMessage ||
                  'FastAPI inference server could not be reached. Predictions are disabled until the backend is running.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void verifyBackend()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 mp-btn-glow whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Split: Input Form + Output */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="xl:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6"
        >
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Synthetic Input Parameters (Do Not Enter Real Patient Info)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {module.features.length} inputs
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {module.features.map((feat) => {
              const currentVal = inputs[feat.key] ?? feat.defaultValue;
              return (
                <div
                  key={feat.key}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/55 p-3.5 hover:border-cyan-400/70 dark:hover:border-cyan-500/45 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`input-${diseaseId}-${feat.key}`}
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {feat.label}
                    </label>
                    {feat.unit && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {feat.unit}
                      </span>
                    )}
                  </div>

                  {feat.type === 'select' && feat.options ? (
                    <select
                      id={`input-${diseaseId}-${feat.key}`}
                      value={currentVal}
                      onChange={(e) => handleFieldChange(feat.key, e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none"
                    >
                      {feat.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          id={`input-${diseaseId}-${feat.key}`}
                          type="number"
                          min={feat.min}
                          max={feat.max}
                          step={feat.step}
                          value={currentVal}
                          onChange={(e) => handleFieldChange(feat.key, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <input
                        type="range"
                        aria-label={`${feat.label} slider`}
                        min={feat.min}
                        max={feat.max}
                        step={feat.step}
                        value={currentVal}
                        onChange={(e) => handleFieldChange(feat.key, e.target.value)}
                        className="w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                        <span>{feat.min}</span>
                        <span>Mean: {feat.referenceMean}</span>
                        <span>{feat.max}</span>
                      </div>
                    </div>
                  )}

                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Mode:{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {backendConfig.mode === 'sklearn_api'
                  ? `Python Scikit-learn FastAPI (${backendConfig.baseUrl || '/api proxy'})`
                  : 'Manual Educational Formula Mode'}
              </span>
            </div>
            <MagneticButton
              type="submit"
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-cyan-500 hover:to-violet-600 disabled:opacity-60 whitespace-nowrap"
            >
              {isRunning ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Running Prediction...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>
                    {backendConfig.mode === 'sklearn_api'
                      ? 'Run Scikit-learn Prediction'
                      : 'Run Demo Prediction'}
                  </span>
                </>
              )}
            </MagneticButton>
          </div>
        </form>

        {/* Result & Explanation Panel */}
        <div className="xl:col-span-5 space-y-6">
          <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {backendConfig.mode === 'sklearn_api' ? 'Prediction Output' : 'Demonstration Output'}
              </h3>
              <span
                className={`text-xs font-medium ${
                  backendConfig.mode === 'sklearn_api' && backendStatus === 'unavailable'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-violet-700 dark:text-cyan-400'
                }`}
              >
                {result
                  ? result.isTrainedModel
                    ? 'Trained Scikit-learn Model'
                    : 'Demonstration Only'
                  : backendConfig.mode === 'sklearn_api'
                  ? backendStatus === 'unavailable'
                    ? 'Backend Offline'
                    : backendStatus === 'checking'
                    ? 'Checking API...'
                    : 'FastAPI Ready'
                  : 'Ready'}
              </span>
            </div>

            {isRunning ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <LoadingSpinner size="lg" />
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Querying {module.metadata.shortTitle} Scikit-learn pipeline...
                </div>
              </div>
            ) : !result ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-cyan-950/60 text-blue-600 dark:text-cyan-400">
                  <Play className="h-5 w-5" />
                </div>
                <h4 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No Prediction Run Yet
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Adjust the input parameters or load an illustrative profile, then click
                  &ldquo;
                  {backendConfig.mode === 'sklearn_api'
                    ? 'Run Scikit-learn Prediction'
                    : 'Run Demo Prediction'}
                  &rdquo; to evaluate the model.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 space-y-5"
              >
                <div
                  className={`rounded-xl border p-4 ${
                    result.predictedClass === 1
                      ? 'border-violet-200 dark:border-violet-500/40 bg-violet-50/70 dark:bg-violet-950/40'
                      : 'border-blue-200 dark:border-cyan-500/40 bg-blue-50/70 dark:bg-cyan-950/35'
                  }`}
                >
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {result.isTrainedModel
                      ? `${result.algorithm || 'Scikit-learn Pipeline'} (Educational Only — Not Diagnosis)`
                      : 'Educational Demonstration Simulation (Not Clinical Diagnosis)'}
                  </div>
                  <div className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {result.predictedLabel}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {result.isTrainedModel ? 'Predicted Positive Probability' : 'Simulated Risk Index'}
                    </span>
                    <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                      <AnimatedCounter
                        value={result.probability * 100}
                        decimals={1}
                        suffix="%"
                        duration={0.55}
                      />
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                    <motion.div
                      className={`h-full ${
                        result.predictedClass === 1
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-600'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(result.probability * 100)}%` }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {result.riskTier}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {result.summaryNote}
                </p>

                {saveMessage ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {saveMessage}
                  </div>
                ) : (
                  !user && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <span>Sign in to save prediction runs to your personal history.</span>
                      <button
                        type="button"
                        onClick={onOpenAuthModal}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 whitespace-nowrap"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Sign In
                      </button>
                    </div>
                  )
                )}

                {result.contributions.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Top Feature Sensitivity Factors
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Blue: Lowering · Purple: Elevating
                      </span>
                    </div>
                    <FeatureContributionChart contributions={result.contributions} />
                  </div>
                )}
              </motion.div>
            )}

            {/* JSON Contract Inspector */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowJsonPayload((v) => !v)}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-cyan-300 rounded px-1.5 py-1 -ml-1.5"
              >
                <Code2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                {showJsonPayload
                  ? 'Hide Python Scikit-learn JSON Payload'
                  : 'Inspect Python Scikit-learn JSON Payload'}
              </button>

              {showJsonPayload && (
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                  {JSON.stringify(
                    {
                      endpoint: `POST ${module.metadata.endpointPath}`,
                      features: inputs,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          </section>

          {/* Per-User Module History */}
          <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Your {module.metadata.shortTitle} History
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {user ? `${diseaseHistory.length} saved` : 'Signed out'}
              </span>
            </div>

            {!user ? (
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Log in to view and reload your past {module.metadata.shortTitle} simulations.
              </div>
            ) : diseaseHistory.length === 0 ? (
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                No saved {module.metadata.shortTitle} runs yet.
              </div>
            ) : (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                {diseaseHistory.map((item) => (
                  <div
                    key={item.id}
                    data-ripple="true"
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 px-3 py-2.5 hover:border-cyan-300/70 dark:hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.predictedLabel}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        Index: {(item.probability * 100).toFixed(1)}% ·{' '}
                        {new Date(item.createdAtMs).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => applyPreset(item.inputsSummary, 'Saved History Inputs')}
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-cyan-300 mp-btn-glow transition-colors"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteHistory(user.uid, item.id)}
                        aria-label="Delete history entry"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
