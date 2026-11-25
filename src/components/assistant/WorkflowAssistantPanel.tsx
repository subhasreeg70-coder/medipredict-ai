import React, { useMemo, useState } from 'react';
import { ArrowRight, Bot, ChevronRight, Send, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigationTransition } from '../../context/NavigationTransitionContext';
import { ML_GLOSSARY } from '../../data/mlGlossary';
import { KNOWLEDGE_MODULES, WORKFLOW_GUIDANCE_ITEMS } from '../../data/knowledgeCentreData';
import { DISEASE_MODULES } from '../../modules/registry';
import { AppView } from '../../types/ml';

interface AssistantMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  recommendedView?: AppView;
  actionLabel?: string;
}

const VIEW_CONTEXT_INTRO: Record<AppView, string> = {
  home: 'You are on the Home Dashboard. Click any disease card to trigger a circular zoom transition into its independent classifier workspace, or explore feature sensitivities below.',
  heart:
    'Heart Disease Module (13 UCI features): Adjust synthetic parameters or load a preset to inspect how an illustrative logistic risk curve reacts—or connect FastAPI Scikit-learn.',
  diabetes:
    'Diabetes Module (8 Pima metabolic features): Glucose, BMI, and Diabetes Pedigree carry the strongest illustrative weights in this non-clinical classroom simulator.',
  'breast-cancer':
    'Breast Cancer Module (10 WDBC mean morphology features): Experiment with concave points, radius, and perimeter to understand boundary separation.',
  datasets:
    'Dataset Explorer & Synthetic Simulator: Switch between Chart.js histograms, scatter plots, box plots, or generate parametric non-PHI synthetic test vectors.',
  performance:
    'Model Performance: All metrics stay honestly marked Pending until a Python Scikit-learn backend responds, or toggle the Formula Sandbox to experiment with TP/FP/FN/TN equations.',
  knowledge:
    'Knowledge Centre: Work through the 5 clinical ML stages and interactive Z-score lab to build foundational intuition.',
  feedback:
    'Feedback & Review: Submit learner comments or report issues directly into Firestore review queues.',
  about:
    'About & Medical Disclaimer: Review non-clinical educational boundaries and the FastAPI + joblib Scikit-learn integration contract.',
};

const WORKFLOW_STEPS: Array<{ label: string; view: AppView }> = [
  { label: '1. Schema', view: 'datasets' },
  { label: '2. Simulate', view: 'heart' },
  { label: '3. Metrics', view: 'performance' },
  { label: '4. Learn', view: 'knowledge' },
];

function resolveGuidanceResponse(query: string): {
  text: string;
  recommendedView?: AppView;
  actionLabel?: string;
} {
  const q = query.trim().toLowerCase();

  for (const item of WORKFLOW_GUIDANCE_ITEMS) {
    if (item.keywords.some((kw) => q.includes(kw))) {
      return {
        text: item.answer,
        recommendedView: item.recommendedView,
        actionLabel: item.actionLabel,
      };
    }
  }

  // Search glossary terms
  for (const rawEntry of Object.values(ML_GLOSSARY)) {
    const entry = rawEntry as {
      term: string;
      definition: string;
      formula?: string;
      contextNote?: string;
    };
    if (q.includes(entry.term.toLowerCase())) {
      return {
        text: `${entry.term}: ${entry.definition}${entry.formula ? ` Formula: ${entry.formula}.` : ''}${entry.contextNote ? ` ${entry.contextNote}` : ''}`,
        recommendedView: 'performance',
        actionLabel: 'Inspect in Model Performance',
      };
    }
  }

  // Search disease features
  for (const mod of Object.values(DISEASE_MODULES)) {
    const feat = mod.features.find(
      (f) => q.includes(f.label.toLowerCase()) || q.includes(f.key.toLowerCase())
    );
    if (feat) {
      return {
        text: `${feat.label} (${mod.metadata.shortTitle}): ${feat.description} Benchmark reference mean is ${feat.referenceMean} (std ${feat.referenceStd}).`,
        recommendedView: mod.metadata.id,
        actionLabel: `Open ${mod.metadata.shortTitle} Module`,
      };
    }
  }

  // Search knowledge stages
  const stage = KNOWLEDGE_MODULES.find(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q)
  );
  if (stage) {
    return {
      text: `${stage.title}: ${stage.summary}`,
      recommendedView: stage.linkedView,
      actionLabel: stage.linkedCta,
    };
  }

  return {
    text: 'I can explain how the educational ML workflow runs across Heart Disease, Diabetes, and Breast Cancer—including Z-score scaling, Confusion Matrix formulas, Synthetic Data Simulation, and Python Scikit-learn FastAPI integration. Try asking about "Recall", "Synthetic data", or "Scikit-learn".',
    recommendedView: 'knowledge',
    actionLabel: 'Browse Knowledge Centre',
  };
}

export function WorkflowAssistantPanel() {
  const { activeView, navigateWithCircularZoom } = useNavigationTransition();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Welcome to the ML Workflow Guide. Select a topic below or ask about any dataset, feature, or Scikit-learn evaluation metric.',
      recommendedView: 'knowledge',
      actionLabel: 'Open Knowledge Centre',
    },
  ]);

  const activeIntro = useMemo(() => VIEW_CONTEXT_INTRO[activeView], [activeView]);

  const handleAsk = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    const reply = resolveGuidanceResponse(trimmed);
    const ts = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${ts}`, role: 'user', text: trimmed },
      {
        id: `a-${ts + 1}`,
        role: 'assistant',
        text: reply.text,
        recommendedView: reply.recommendedView,
        actionLabel: reply.actionLabel,
      },
    ]);
    setInput('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(input);
  };

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Educational ML Workflow Assistant"
            className="mb-3 w-[min(92vw,390px)] rounded-2xl border border-cyan-300/60 dark:border-cyan-500/35 mp-glass-panel shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-violet-600/10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-[0_0_16px_rgba(34,211,238,0.45)]">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
                    ML Workflow Assistant
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Educational Sandbox Guide (Non-Clinical)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close workflow assistant"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Active View Context Strip */}
            <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/75 border-b border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isCurrent = step.view === activeView;
                  return (
                    <React.Fragment key={step.view}>
                      <button
                        type="button"
                        onClick={(e) =>
                          navigateWithCircularZoom(step.view, e.currentTarget, undefined, {
                            accent: 'cyan',
                          })
                        }
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all whitespace-nowrap ${
                          isCurrent
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/50'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {step.label}
                      </button>
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeIntro}
              </p>
            </div>

            {/* Messages */}
            <div className="max-h-60 overflow-y-auto px-4 py-3 space-y-2.5">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`rounded-xl p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'ml-8 bg-blue-600 text-white'
                      : 'mr-4 border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div>{msg.text}</div>
                  {msg.recommendedView && msg.actionLabel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        if (msg.recommendedView) {
                          navigateWithCircularZoom(
                            msg.recommendedView,
                            e.currentTarget,
                            undefined,
                            { accent: 'cyan', title: msg.actionLabel }
                          );
                        }
                      }}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-cyan-700 dark:text-cyan-400 hover:underline"
                    >
                      {msg.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Quick Prompts */}
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {WORKFLOW_GUIDANCE_ITEMS.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAsk(item.question)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  {item.question.replace('?', '')}
                </button>
              ))}
            </div>

            {/* Ask Input */}
            <form
              onSubmit={handleFormSubmit}
              className="flex items-center gap-2 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Recall, Z-scores, Python API..."
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send workflow question"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 text-white mp-btn-glow"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Launcher Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-xl border border-cyan-400/50 bg-slate-900/95 dark:bg-[#07112b]/95 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_28px_-6px_rgba(34,211,238,0.45)] backdrop-blur-md mp-btn-glow"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="whitespace-nowrap">
          {open ? 'Hide Workflow Guide' : 'AI Workflow Guide'}
        </span>
      </motion.button>
    </div>
  );
}
