import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  GitCompare,
  Plug,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { DISEASE_LIST, DISEASE_MODULES } from '../../modules/registry';
import { BackendConnectionConfig, fetchModelEvaluation } from '../../services/mlClient';
import { ConfusionMatrixCounts, DiseaseId, ModelEvaluationState } from '../../types/ml';
import { ConfusionMatrixGrid } from '../charts/ConfusionMatrixGrid';
import { ModelComparisonChart } from '../charts/ModelComparisonChart';
import { GlossaryTooltip } from '../common/GlossaryTooltip';
import { LoadingSpinner } from '../common/LoadingIndicator';
import { AnimatedCounter } from '../interactive/AnimatedCounter';
import { MagneticButton } from '../interactive/MagneticButton';
import { TiltCard } from '../interactive/TiltCard';

interface ModelPerformanceViewProps {
  backendConfig: BackendConnectionConfig;
  onChangeBackendConfig: (next: BackendConnectionConfig) => void;
}

export function ModelPerformanceView({
  backendConfig,
  onChangeBackendConfig,
}: ModelPerformanceViewProps) {
  const { showToast } = useToast();
  const [selectedDisease, setSelectedDisease] = useState<DiseaseId>('heart');
  const [evalState, setEvalState] = useState<ModelEvaluationState | null>(null);
  const [allEvaluations, setAllEvaluations] = useState<
    Partial<Record<DiseaseId, ModelEvaluationState>>
  >({});
  const [comparisonMode, setComparisonMode] = useState<'dataset_structure' | 'live_metrics'>(
    'dataset_structure'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxCounts, setSandboxCounts] = useState<ConfusionMatrixCounts>({
    truePositive: 42,
    falsePositive: 6,
    falseNegative: 5,
    trueNegative: 47,
  });

  const module = DISEASE_MODULES[selectedDisease];

  const loadEvaluation = async (
    disease: DiseaseId,
    cfg: BackendConnectionConfig,
    notify = false
  ) => {
    setIsLoading(true);
    setConnectionError(null);
    const mod = DISEASE_MODULES[disease];

    try {
      if (cfg.mode === 'sklearn_api') {
        const results = await Promise.allSettled(
          DISEASE_LIST.map((d) => fetchModelEvaluation(d.metadata.id, cfg))
        );
        const nextMap: Partial<Record<DiseaseId, ModelEvaluationState>> = {};
        let selectedError: string | null = null;

        results.forEach((res, idx) => {
          const id = DISEASE_LIST[idx].metadata.id;
          if (res.status === 'fulfilled') {
            nextMap[id] = res.value;
          } else {
            const errMsg =
              res.reason instanceof Error
                ? res.reason.message
                : `Unable to load metrics for ${id}.`;
            if (id === disease) selectedError = errMsg;
            nextMap[id] = {
              diseaseId: id,
              modelName: `${DISEASE_MODULES[id].metadata.shortTitle} Scikit-learn Model`,
              plannedAlgorithm: DISEASE_MODULES[id].metadata.plannedAlgorithm,
              endpointPath: DISEASE_MODULES[id].metadata.endpointPath,
              status: 'backend_unavailable',
              statusLabel: 'FastAPI Backend Unavailable — Real Evaluation Metrics Offline',
              accuracy: null,
              precision: null,
              recall: null,
              f1Score: null,
              rocAuc: null,
              confusionMatrix: null,
              errorMessage: errMsg,
              lastCheckedIso: new Date().toISOString(),
            };
          }
        });

        setAllEvaluations((prev) => ({ ...prev, ...nextMap }));
        const activeResult = nextMap[disease] ?? null;
        setEvalState(activeResult);

        if (selectedError) {
          setConnectionError(selectedError);
          if (notify) {
            showToast({
              title: 'Python FastAPI endpoint unavailable',
              description: selectedError,
              variant: 'warning',
            });
          }
        } else if (notify && activeResult) {
          showToast({
            title: 'Scikit-learn metrics loaded',
            description: activeResult.statusLabel,
            variant: 'success',
          });
        }
      } else {
        const result = await fetchModelEvaluation(disease, cfg);
        setEvalState(result);
        setAllEvaluations((prev) => ({ ...prev, [disease]: result }));
        if (notify) {
          showToast({
            title: 'Demo mode status refreshed',
            description: result.statusLabel,
            variant: 'info',
          });
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to reach Python Scikit-learn endpoint.';
      setConnectionError(msg);
      const unavailableState: ModelEvaluationState = {
        diseaseId: disease,
        modelName: `${mod.metadata.shortTitle} Scikit-learn Model`,
        plannedAlgorithm: mod.metadata.plannedAlgorithm,
        endpointPath: mod.metadata.endpointPath,
        status: 'backend_unavailable',
        statusLabel: 'FastAPI Backend Unavailable — Real Evaluation Metrics Offline',
        accuracy: null,
        precision: null,
        recall: null,
        f1Score: null,
        rocAuc: null,
        confusionMatrix: null,
        errorMessage: msg,
        lastCheckedIso: new Date().toISOString(),
      };
      setEvalState(unavailableState);
      setAllEvaluations((prev) => ({ ...prev, [disease]: unavailableState }));
      if (notify) {
        showToast({
          title: 'Python endpoint unreachable',
          description: msg,
          variant: 'warning',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvaluation(selectedDisease, backendConfig, false);
  }, [selectedDisease, backendConfig]);

  const sandboxTotal =
    sandboxCounts.truePositive +
    sandboxCounts.falsePositive +
    sandboxCounts.falseNegative +
    sandboxCounts.trueNegative;

  const sandboxAccuracy =
    sandboxTotal > 0
      ? (sandboxCounts.truePositive + sandboxCounts.trueNegative) / sandboxTotal
      : 0;
  const sandboxPrecision =
    sandboxCounts.truePositive + sandboxCounts.falsePositive > 0
      ? sandboxCounts.truePositive /
        (sandboxCounts.truePositive + sandboxCounts.falsePositive)
      : 0;
  const sandboxRecall =
    sandboxCounts.truePositive + sandboxCounts.falseNegative > 0
      ? sandboxCounts.truePositive /
        (sandboxCounts.truePositive + sandboxCounts.falseNegative)
      : 0;
  const sandboxF1 =
    sandboxPrecision + sandboxRecall > 0
      ? (2 * sandboxPrecision * sandboxRecall) / (sandboxPrecision + sandboxRecall)
      : 0;

  const activeAccuracy = sandboxOpen ? sandboxAccuracy : evalState?.accuracy ?? null;
  const activePrecision = sandboxOpen ? sandboxPrecision : evalState?.precision ?? null;
  const activeRecall = sandboxOpen ? sandboxRecall : evalState?.recall ?? null;
  const activeF1 = sandboxOpen ? sandboxF1 : evalState?.f1Score ?? null;
  const activeMatrix = sandboxOpen ? sandboxCounts : evalState?.confusionMatrix ?? null;

  const renderMetricValue = (val: number | null) => {
    if (isLoading) return <LoadingSpinner size="sm" />;
    if (val === null) {
      return evalState?.status === 'backend_unavailable' ? 'Offline' : 'Pending';
    }
    return <AnimatedCounter value={val * 100} decimals={1} suffix="%" duration={0.4} />;
  };

  const handleToggleSandbox = () => {
    const next = !sandboxOpen;
    setSandboxOpen(next);
    if (next) {
      setComparisonMode('live_metrics');
    }
    showToast({
      title: next ? 'Formula Sandbox enabled' : 'Returned to model status',
      description: next
        ? 'Adjust TP/FP/FN/TN sliders to inspect metric equations.'
        : 'Showing actual training status for this module.',
      variant: 'info',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Disease Switcher */}
      <TiltCard
        layoutId="module-hero-performance"
        maxTilt={2}
        ripple={false}
        className="rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-violet-700 dark:text-cyan-400">
              Independent Model Registry · Transparent Training Verification
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              Model Performance & Cross-Module Comparison
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Each disease pipeline maintains its own dataset and Scikit-learn artifact. Hover or
              focus any metric label to learn its mathematical definition.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Select disease model"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1"
          >
            {DISEASE_LIST.map((d) => {
              const active = d.metadata.id === selectedDisease;
              return (
                <button
                  key={d.metadata.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedDisease(d.metadata.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {d.metadata.shortTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* Honest Training Status Banner */}
        <div
          className={`mt-5 rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
            evalState?.status === 'connected_sklearn'
              ? 'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/35'
              : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30'
          }`}
        >
          <div className="flex items-start gap-3">
            {evalState?.status === 'connected_sklearn' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            )}
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {evalState?.statusLabel || 'Checking model training state...'}
              </div>
              <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                <GlossaryTooltip termKey="plannedEstimator" placement="bottom">
                  {evalState?.status === 'connected_sklearn' ? 'Trained Estimator' : 'Planned Estimator'}
                </GlossaryTooltip>
                : {evalState?.algorithm || module.metadata.plannedAlgorithm} · Endpoint:{' '}
                <span className="font-mono">{module.metadata.endpointPath}</span>
                {typeof evalState?.rocAuc === 'number' && (
                  <>
                    {' · '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Test ROC-AUC: {(evalState.rocAuc * 100).toFixed(1)}%
                    </span>
                  </>
                )}
                {evalState?.trainRows && evalState?.testRows && (
                  <>
                    {' · '}
                    <span>
                      Split: {evalState.trainRows} train / {evalState.testRows} test
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <MagneticButton
            onClick={handleToggleSandbox}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
              sandboxOpen
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {sandboxOpen ? 'Exit Formula Sandbox' : 'Open Metric Formula Sandbox'}
          </MagneticButton>
        </div>

        {sandboxOpen && (
          <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-800/70 bg-violet-50/60 dark:bg-violet-950/35 px-4 py-3 text-xs text-violet-900 dark:text-violet-200">
            <span className="font-semibold">Formula Sandbox Active:</span> The numbers below are
            live mathematical outputs from your manual TP/FP/FN/TN sliders for learning how{' '}
            <GlossaryTooltip termKey="precision" placement="bottom">
              Precision
            </GlossaryTooltip>
            ,{' '}
            <GlossaryTooltip termKey="recall" placement="bottom">
              Recall
            </GlossaryTooltip>
            , and{' '}
            <GlossaryTooltip termKey="f1Score" placement="bottom">
              F1-score
            </GlossaryTooltip>{' '}
            work. They are <span className="font-semibold underline">not</span> trained model
            benchmarks.
          </div>
        )}
      </TiltCard>

      {/* 4 Evaluation Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TiltCard
          maxTilt={6}
          className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-5"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <GlossaryTooltip termKey="accuracy" align="left" placement="bottom">
              Accuracy
            </GlossaryTooltip>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {renderMetricValue(activeAccuracy)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            (TP + TN) / Total
          </div>
        </TiltCard>

        <TiltCard
          maxTilt={6}
          className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-5"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <GlossaryTooltip termKey="precision" align="left" placement="bottom">
              Precision
            </GlossaryTooltip>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-cyan-400">
            {renderMetricValue(activePrecision)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            TP / (TP + FP)
          </div>
        </TiltCard>

        <TiltCard
          maxTilt={6}
          className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-5"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <GlossaryTooltip termKey="recall" align="center" placement="bottom">
              Recall (Sensitivity)
            </GlossaryTooltip>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-400">
            {renderMetricValue(activeRecall)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            TP / (TP + FN)
          </div>
        </TiltCard>

        <TiltCard
          maxTilt={6}
          className="rounded-xl border border-slate-200/90 dark:border-slate-800 p-5"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <GlossaryTooltip termKey="f1Score" align="right" placement="bottom">
              F1-Score
            </GlossaryTooltip>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {renderMetricValue(activeF1)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            2 · (P · R) / (P + R)
          </div>
        </TiltCard>
      </section>

      {/* Confusion Matrix + Formula Sandbox Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                <GlossaryTooltip termKey="confusionMatrix" placement="bottom">
                  Confusion Matrix
                </GlossaryTooltip>{' '}
                ({module.metadata.shortTitle})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {sandboxOpen ? (
                  'Interactive educational confusion matrix driven by sandbox sliders'
                ) : evalState?.status === 'connected_sklearn' ? (
                  <>
                    Live{' '}
                    <GlossaryTooltip termKey="holdoutEvaluation" placement="bottom">
                      holdout evaluation
                    </GlossaryTooltip>{' '}
                    counts from connected Scikit-learn service
                  </>
                ) : (
                  'Displays pending placeholders until a trained Scikit-learn model is connected'
                )}
              </p>
            </div>
          </div>

          <ConfusionMatrixGrid
            matrix={activeMatrix}
            positiveLabel={module.metadata.positiveClassLabel.split(' ')[0]}
            negativeLabel={module.metadata.negativeClassLabel.split(' ')[0]}
            isSandbox={sandboxOpen}
          />

          {sandboxOpen && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ['truePositive', 'True Positives (TP)'],
                  ['falsePositive', 'False Positives (FP)'],
                  ['falseNegative', 'False Negatives (FN)'],
                  ['trueNegative', 'True Negatives (TN)'],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3"
                >
                  <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                    <GlossaryTooltip termKey={key} placement="top">
                      {label}
                    </GlossaryTooltip>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {sandboxCounts[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={150}
                    value={sandboxCounts[key]}
                    onChange={(e) =>
                      setSandboxCounts((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="mt-2 w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Connect Python Scikit-learn Backend */}
        <section className="xl:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Plug className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Python Scikit-learn API Bridge
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect a local FastAPI / Flask Scikit-learn service when ready
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Inference Mode
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => {
                    onChangeBackendConfig({ ...backendConfig, mode: 'demo' });
                    showToast({
                      title: 'Switched to Demo Simulator',
                      description: 'Using built-in educational scoring formulas.',
                      variant: 'info',
                    });
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    backendConfig.mode === 'demo'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Demo Simulator
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeBackendConfig({ ...backendConfig, mode: 'sklearn_api' });
                    showToast({
                      title: 'Switched to Scikit-learn API',
                      description: `Target URL: ${backendConfig.baseUrl}`,
                      variant: 'info',
                    });
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    backendConfig.mode === 'sklearn_api'
                      ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Scikit-learn API
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="sklearn-base-url"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Python Backend Base URL
              </label>
              <input
                id="sklearn-base-url"
                type="text"
                value={backendConfig.baseUrl}
                onChange={(e) =>
                  onChangeBackendConfig({ ...backendConfig, baseUrl: e.target.value })
                }
                placeholder="Same-origin /api proxy (or http://localhost:8001)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {connectionError && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/35 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                {connectionError}
              </div>
            )}

            <MagneticButton
              disabled={isLoading}
              onClick={() => void loadEvaluation(selectedDisease, backendConfig, true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Checking Endpoint...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Test Endpoint & Refresh Metrics</span>
                </>
              )}
            </MagneticButton>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Included in this workspace: <span className="font-mono">python_backend/app.py</span>{' '}
              with separate joblib pipelines for <span className="font-mono">heart</span>,{' '}
              <span className="font-mono">diabetes</span>, and{' '}
              <span className="font-mono">breast-cancer</span>.
            </div>
          </div>
        </section>
      </div>

      {/* Cross-Module Comparison Section */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <GitCompare className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Cross-Module Architecture & Benchmark Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compare dataset target balance and planned estimators across the three isolated
                pipelines (metrics stay 0% / Pending until trained backend or Formula Sandbox is active)
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Comparison chart mode"
            className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={comparisonMode === 'dataset_structure'}
              onClick={() => setComparisonMode('dataset_structure')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                comparisonMode === 'dataset_structure'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Class Balance (%)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={comparisonMode === 'live_metrics'}
              onClick={() => setComparisonMode('live_metrics')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                comparisonMode === 'live_metrics'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Evaluation Metrics
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-6">
            <ModelComparisonChart
              mode={comparisonMode}
              evaluations={allEvaluations}
              sandboxMetrics={
                sandboxOpen
                  ? {
                      accuracy: sandboxAccuracy,
                      precision: sandboxPrecision,
                      recall: sandboxRecall,
                      f1Score: sandboxF1,
                    }
                  : null
              }
              activeDisease={selectedDisease}
            />
          </div>

          <div className="xl:col-span-6 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-3">Pipeline</th>
                  <th className="py-2.5 pr-3">Planned Estimator</th>
                  <th className="py-2.5 pr-3 text-right">Features</th>
                  <th className="py-2.5 pr-3 text-right">Rows</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {DISEASE_LIST.map((d) => {
                  const ev = allEvaluations[d.metadata.id];
                  const isConnected = ev?.status === 'connected_sklearn';
                  return (
                    <tr
                      key={d.metadata.id}
                      onClick={() => setSelectedDisease(d.metadata.id)}
                      className={`cursor-pointer transition-colors ${
                        d.metadata.id === selectedDisease
                          ? 'bg-cyan-50/50 dark:bg-cyan-950/25'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {d.metadata.shortTitle}
                      </td>
                      <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                        {ev?.algorithm || d.metadata.plannedAlgorithm}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {d.metadata.featureCount}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {ev?.totalRows ?? d.metadata.benchmarkRowCount}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isConnected
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ev?.status === 'backend_unavailable'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isConnected
                            ? `Trained (${((ev?.accuracy ?? 0) * 100).toFixed(1)}% Acc)`
                            : ev?.status === 'backend_unavailable'
                            ? 'Backend Offline'
                            : 'Demo (Pending)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
