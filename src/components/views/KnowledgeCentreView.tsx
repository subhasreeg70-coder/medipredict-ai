import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Calculator, CheckCircle2, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigationTransition } from '../../context/NavigationTransitionContext';
import { useToast } from '../../context/ToastContext';
import { KNOWLEDGE_MODULES } from '../../data/knowledgeCentreData';
import { MagneticButton } from '../interactive/MagneticButton';
import { TiltCard } from '../interactive/TiltCard';

const COMPLETED_STORAGE_KEY = 'medipredict_knowledge_completed';

export function KnowledgeCentreView() {
  const { navigateWithCircularZoom } = useNavigationTransition();
  const { showToast } = useToast();

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(COMPLETED_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  // Interactive Z-Score Normalization Micro-Lab
  const [rawInputVal, setRawInputVal] = useState<number>(158);
  const [sampleMean, setSampleMean] = useState<number>(121);
  const [sampleStd, setSampleStd] = useState<number>(32);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completedIds));
    } catch {
      // Ignore storage failures
    }
  }, [completedIds]);

  const zScore = sampleStd > 0 ? (rawInputVal - sampleMean) / sampleStd : 0;
  const sigmoidProb = 1 / (1 + Math.exp(-zScore));
  const progressPct = Math.round((completedIds.length / KNOWLEDGE_MODULES.length) * 100);

  const toggleCompleted = (id: string, title: string) => {
    setCompletedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      showToast({
        title: exists ? 'Stage marked unread' : 'Stage completed',
        description: title,
        variant: exists ? 'info' : 'success',
      });
      return next;
    });
  };

  const handleSelectAnswer = (moduleId: string, optionIdx: number, correctIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [moduleId]: optionIdx }));
    if (optionIdx === correctIdx && !completedIds.includes(moduleId)) {
      setCompletedIds((prev) => [...prev, moduleId]);
      showToast({
        title: 'Concept check verified',
        description: 'Stage marked complete in your study progress.',
        variant: 'success',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <TiltCard
        layoutId="module-hero-knowledge"
        maxTilt={2.5}
        ripple={false}
        className="rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-700 dark:text-cyan-400">
              <GraduationCap className="h-4 w-4" />
              Educational Knowledge Centre · Structured Clinical ML Curriculum
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Healthcare Machine Learning Workflow Guide
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Master how tabular healthcare datasets move from non-PHI schemas and Z-score scaling
              to Scikit-learn classification and recall-aware evaluation.
            </p>
          </div>

          <div className="min-w-[230px] rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/75 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>Study Progress</span>
              <span className="font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-300">
                {completedIds.length}/{KNOWLEDGE_MODULES.length} ({progressPct}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </TiltCard>

      {/* Interactive Z-Score & Sigmoid Micro-Lab */}
      <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Calculator className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Interactive Z-Score & Logistic Activation Lab
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust feature value, training mean, and standard deviation to watch StandardScaler
              and sigmoid activation respond live
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3.5">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                <span>Input x</span>
                <span className="font-mono tabular-nums text-cyan-600 dark:text-cyan-300">
                  {rawInputVal}
                </span>
              </div>
              <input
                type="range"
                aria-label="Raw input x"
                min={50}
                max={250}
                value={rawInputVal}
                onChange={(e) => setRawInputVal(Number(e.target.value))}
                className="mt-2 w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3.5">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                <span>Train Mean (μ)</span>
                <span className="font-mono tabular-nums text-cyan-600 dark:text-cyan-300">
                  {sampleMean}
                </span>
              </div>
              <input
                type="range"
                aria-label="Training mean"
                min={70}
                max={180}
                value={sampleMean}
                onChange={(e) => setSampleMean(Number(e.target.value))}
                className="mt-2 w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3.5">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                <span>Train Std (σ)</span>
                <span className="font-mono tabular-nums text-cyan-600 dark:text-cyan-300">
                  {sampleStd}
                </span>
              </div>
              <input
                type="range"
                aria-label="Training standard deviation"
                min={10}
                max={70}
                value={sampleStd}
                onChange={(e) => setSampleStd(Number(e.target.value))}
                className="mt-2 w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-200/80 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/30 p-3.5">
              <div className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                Standardized Z-Score
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {zScore >= 0 ? '+' : ''}
                {zScore.toFixed(2)}σ
              </div>
            </div>
            <div className="rounded-xl border border-violet-200/80 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-950/30 p-3.5">
              <div className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
                Sigmoid σ(z) Output
              </div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {(sigmoidProb * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Stage Cards */}
      <div className="space-y-4">
        {KNOWLEDGE_MODULES.map((mod) => {
          const isCompleted = completedIds.includes(mod.id);
          const chosen = selectedAnswers[mod.id];
          const answeredCorrectly = chosen === mod.checkQuestion.correctIndex;

          return (
            <article
              key={mod.id}
              data-ripple="true"
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 mp-glow-hover"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                      Stage {mod.stageNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.durationLabel}</span>
                    {isCompleted && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completed
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {mod.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                    {mod.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCompleted(mod.id, mod.title)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                      isCompleted
                        ? 'border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-400'
                    }`}
                  >
                    {isCompleted ? 'Completed' : 'Mark Complete'}
                  </button>
                  <MagneticButton
                    onClick={(e) =>
                      navigateWithCircularZoom(mod.linkedView, e.currentTarget, undefined, {
                        accent: 'cyan',
                        title: mod.linkedCta,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                  >
                    {mod.linkedCta}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </MagneticButton>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {mod.summary}
              </p>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-7 space-y-2">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    Key Learning Takeaways
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                    {mod.keyTakeaways.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  {mod.formulaExpr && (
                    <div className="mt-3 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-900/95 px-3.5 py-2.5">
                      <div className="text-[11px] text-slate-400">{mod.formulaLabel}</div>
                      <code className="mt-0.5 block font-mono text-xs text-cyan-300">
                        {mod.formulaExpr}
                      </code>
                    </div>
                  )}
                </div>

                {/* Concept Check */}
                <div className="lg:col-span-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-4">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Concept Check
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                    {mod.checkQuestion.prompt}
                  </p>
                  <div className="mt-2.5 space-y-1.5">
                    {mod.checkQuestion.options.map((opt, idx) => {
                      const isPicked = chosen === idx;
                      const isCorrect = idx === mod.checkQuestion.correctIndex;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            handleSelectAnswer(mod.id, idx, mod.checkQuestion.correctIndex)
                          }
                          className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                            isPicked
                              ? isCorrect
                                ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-medium'
                                : 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {chosen !== undefined && (
                    <div
                      className={`mt-2.5 text-[11px] leading-relaxed ${
                        answeredCorrectly
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {answeredCorrectly ? 'Correct: ' : 'Note: '}
                      {mod.checkQuestion.explanation}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
