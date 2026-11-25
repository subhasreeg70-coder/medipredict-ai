import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Database,
  Dices,
  Dna,
  Droplets,
  HeartPulse,
  History,
  Microscope,
  Play,
  Scan,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useNavigationTransition, ZoomAccent } from '../../context/NavigationTransitionContext';
import { useSound } from '../../context/SoundContext';
import { useToast } from '../../context/ToastContext';
import { SyntheticDemoHistoryItem } from '../../data/featureImportanceData';
import { DISEASE_LIST, DISEASE_MODULES } from '../../modules/registry';
import { deleteUserPrediction } from '../../services/firestoreService';
import { DiseaseId } from '../../types/ml';
import { DatasetComparisonChart } from '../charts/DatasetComparisonChart';
import { InteractiveFeatureImportance } from '../charts/InteractiveFeatureImportance';
import { AnimatedNeuralNetwork } from '../background/AnimatedNeuralNetwork';
import { EducationalNotice } from '../common/EducationalNotice';
import { LoadingRowsSkeleton } from '../common/LoadingIndicator';
import { AnimatedCounter } from '../interactive/AnimatedCounter';
import { AnimatedHeroTitle } from '../interactive/AnimatedHeroTitle';
import { CinematicSection } from '../interactive/CinematicSection';
import { HolographicHudOverlay } from '../interactive/HolographicHudOverlay';
import { MagneticButton } from '../interactive/MagneticButton';
import { TiltCard } from '../interactive/TiltCard';
import { DnaHelixCanvas } from '../three/DnaHelixCanvas';
import {
  HologramFocusMode,
  HologramMorphMode,
  HolographicHumanScene,
} from '../three/HolographicHumanScene';
import { NeuralBrainCanvas } from '../three/NeuralBrainCanvas';

interface HomeDashboardProps {
  onOpenAuthModal: () => void;
  syntheticHistory: SyntheticDemoHistoryItem[];
  onReloadSyntheticRun: (
    diseaseId: DiseaseId,
    inputs: Record<string, number>,
    label: string,
    sourceEl?: HTMLElement | null
  ) => void;
}

const DISEASE_ICON_MAP = {
  heart: HeartPulse,
  diabetes: Droplets,
  'breast-cancer': Microscope,
} as const;

const DISEASE_ACCENT_MAP: Record<DiseaseId, ZoomAccent> = {
  heart: 'cyan',
  diabetes: 'blue',
  'breast-cancer': 'violet',
};

const FOCUS_MODES: Array<{ id: HologramFocusMode; label: string }> = [
  { id: 'full', label: 'Full Scan' },
  { id: 'cardiac', label: 'Cardiac Focus' },
  { id: 'neural', label: 'Neural Focus' },
];

const MORPH_MODES: Array<{ id: HologramMorphMode; label: string }> = [
  { id: 'auto', label: 'Auto Morph' },
  { id: 'hologram', label: 'Hologram' },
  { id: 'particles', label: 'Particle Dissolve' },
  { id: 'wireframe', label: '3D Wireframe' },
];

export function HomeDashboard({
  onOpenAuthModal,
  syntheticHistory,
  onReloadSyntheticRun,
}: HomeDashboardProps) {
  const { user, predictions, predictionsLoading } = useAuth();
  const { navigateWithCircularZoom } = useNavigationTransition();
  const { playCue } = useSound();
  const { showToast } = useToast();
  const [focusMode, setFocusMode] = useState<HologramFocusMode>('full');
  const [morphMode, setMorphMode] = useState<HologramMorphMode>('auto');
  const [chartTab, setChartTab] = useState<'balance' | 'importance'>('balance');
  const [historyTab, setHistoryTab] = useState<'account' | 'synthetic'>(
    user ? 'account' : 'synthetic'
  );

  const totalBenchmarkSamples = DISEASE_LIST.reduce(
    (sum, mod) => sum + mod.metadata.benchmarkRowCount,
    0
  );
  const totalFeatures = DISEASE_LIST.reduce(
    (sum, mod) => sum + mod.metadata.featureCount,
    0
  );

  const handleDeletePrediction = async (uid: string, id: string) => {
    await deleteUserPrediction(uid, id);
    showToast({
      title: 'Prediction deleted',
      description: 'Removed saved run from your personal history.',
      variant: 'info',
    });
  };

  return (
    <div className="space-y-9">
      <EducationalNotice />

      {/* 1. Futuristic Holographic 3D Hero Stage */}
      <section
        aria-label="Holographic 3D Command Stage"
        className="relative rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#03081a] via-[#06102b] to-[#110a2e] shadow-[0_28px_80px_-24px_rgba(6,182,212,0.38)] overflow-hidden mp-neon-border"
      >
        {/* Atmospheric internal glow & neural lattice layers (placed strictly behind content & canvas) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl mp-aurora-glow"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 right-12 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl mp-aurora-glow"
          style={{ animationDelay: '-7s' }}
        />
        <AnimatedNeuralNetwork />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-4 p-6 sm:p-8 lg:p-10">
          {/* Left Hero Typography & Controls */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Scan className="h-3.5 w-3.5 text-cyan-400" />
              Educational Healthcare ML Laboratory · 3 Isolated Pipelines
            </div>

            <AnimatedHeroTitle className="mt-3 text-white" />

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Step inside an interactive 3D biomedical simulation sandbox. Inspect holographic
              anatomical scanning, floating DNA double-helix structures, and real-time neural
              topologies across isolated Heart Disease, Diabetes, and Breast Cancer workflows.
            </p>

            {/* Interactive Hologram Focus & Transformation Controls */}
            <div className="mt-6 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mr-1">
                  Scanner Focus:
                </span>
                <div
                  role="tablist"
                  aria-label="Hologram anatomical focus mode"
                  className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-cyan-500/25 bg-[#050d24]/90 p-1"
                >
                  {FOCUS_MODES.map((mode) => {
                    const active = focusMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setFocusMode(mode.id);
                          playCue('scan');
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/35 text-cyan-200 border border-cyan-400/50 shadow-[0_0_18px_-4px_rgba(34,211,238,0.65)]'
                            : 'text-slate-400 hover:text-cyan-200 border border-transparent'
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mr-1">
                  Hologram State:
                </span>
                <div
                  role="tablist"
                  aria-label="Hologram transformation state"
                  className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-violet-500/25 bg-[#070d24]/90 p-1"
                >
                  {MORPH_MODES.map((m) => {
                    const active = morphMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setMorphMode(m.id);
                          playCue('scan');
                        }}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap ${
                          active
                            ? 'bg-gradient-to-r from-violet-500/35 to-cyan-500/30 text-violet-100 border border-violet-400/50 shadow-[0_0_16px_-4px_rgba(167,139,250,0.6)]'
                            : 'text-slate-400 hover:text-violet-200 border border-transparent'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Magnetic Portal CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <MagneticButton
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'heart',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'cyan', title: 'Heart Disease Module' }
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-4px_rgba(34,211,238,0.55)] hover:from-cyan-400 hover:to-violet-500 whitespace-nowrap"
              >
                Try Prediction Demo
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
              <MagneticButton
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'datasets',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'blue', title: 'Dataset Explorer & Simulator' }
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-[#081330]/90 px-4 py-3 text-sm font-medium text-cyan-100 hover:border-cyan-400/70 whitespace-nowrap"
              >
                <Database className="h-4 w-4 text-cyan-400" />
                Explore Datasets
              </MagneticButton>
              <MagneticButton
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'knowledge',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'violet', title: 'Knowledge Centre' }
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-[#0d1033]/90 px-4 py-3 text-sm font-medium text-violet-100 hover:border-violet-400/70 whitespace-nowrap"
              >
                <BookOpen className="h-4 w-4 text-violet-400" />
                Knowledge Centre
              </MagneticButton>
            </div>
          </div>

          {/* Right Live 3D Holographic Human Viewport (zero backdrop-blur over WebGL canvas) */}
          <div className="lg:col-span-5 relative rounded-2xl border border-cyan-400/20 bg-[#020616]/90 overflow-hidden shadow-[inset_0_0_45px_rgba(34,211,238,0.12)]">
            <HolographicHudOverlay activeModeLabel={`${focusMode} · ${morphMode}`} />

            <HolographicHumanScene
              focusMode={focusMode}
              morphMode={morphMode}
              onChangeFocusMode={setFocusMode}
            />

            <div className="relative z-10 px-4 py-2.5 border-t border-cyan-500/20 bg-[#03091f] flex items-center justify-between text-[11px] text-cyan-200/80">
              <span>Interactive 3D Hologram · Dissolve &amp; Wireframe</span>
              <span className="font-mono text-cyan-400 uppercase">{morphMode}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Dual 3D Bio-Genomic & AI Neural Showcase */}
      <CinematicSection parallaxOffset={14}>
        <section
          aria-label="3D DNA Double Helix and Neural Network Brain Visualizations"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* 3D DNA Double Helix Card */}
          <TiltCard
            maxTilt={3.5}
            ripple={false}
            className="rounded-2xl border border-slate-200/90 dark:border-cyan-500/25 mp-liquid-glass mp-holo-card p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-600 dark:text-cyan-300 shadow-[0_0_16px_-4px_rgba(34,211,238,0.5)]">
                  <Dna className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    3D Bio-Genomic Double Helix
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rotating helical strands with travelling particle signals
                  </p>
                </div>
              </div>
              <MagneticButton
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'datasets',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'cyan', title: 'Dataset Explorer & Synthetic Simulator' }
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 whitespace-nowrap"
              >
                Explore Data
                <ArrowRight className="h-3.5 w-3.5" />
              </MagneticButton>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-[#03091d] overflow-hidden">
              <DnaHelixCanvas />
            </div>
          </TiltCard>

          {/* 3D AI Neural Network Brain Card */}
          <TiltCard
            maxTilt={3.5}
            ripple={false}
            className="rounded-2xl border border-slate-200/90 dark:border-violet-500/25 mp-liquid-glass mp-holo-card p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-400/35 text-violet-600 dark:text-violet-300 shadow-[0_0_16px_-4px_rgba(139,92,246,0.5)]">
                  <BrainCircuit className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    3D AI Neural Topology
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pulsing cortical nodes & travelling synaptic light pathways
                  </p>
                </div>
              </div>
              <MagneticButton
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'performance',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'violet', title: 'Model Performance & Evaluation' }
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 whitespace-nowrap"
              >
                Inspect Models
                <ArrowRight className="h-3.5 w-3.5" />
              </MagneticButton>
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-[#03091d] overflow-hidden">
              <NeuralBrainCanvas />
            </div>
          </TiltCard>
        </section>
      </CinematicSection>

      {/* 3. 4-column Summary Strip with 3D Tilt & Animated Counters */}
      <CinematicSection parallaxOffset={14}>
        <section
          aria-label="Project statistics"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          <TiltCard
            interactive
            maxTilt={7}
            onClick={(e) =>
              navigateWithCircularZoom(
                'heart',
                e.currentTarget,
                { clientX: e.clientX, clientY: e.clientY },
                { accent: 'cyan', title: 'Disease Modules' }
              )
            }
            className="rounded-xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-holo-card p-5"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Disease Modules
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedCounter value={3} duration={0.6} />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Isolated schemas & demo estimators
            </div>
          </TiltCard>

          <TiltCard
            interactive
            maxTilt={7}
            onClick={(e) =>
              navigateWithCircularZoom(
                'datasets',
                e.currentTarget,
                { clientX: e.clientX, clientY: e.clientY },
                { accent: 'blue', title: 'Combined Input Features' }
              )
            }
            className="rounded-xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-holo-card p-5"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Combined Input Features
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-cyan-300">
              <AnimatedCounter value={totalFeatures} />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: '88%' }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              13 Heart · 8 Diabetes · 10 Cancer
            </div>
          </TiltCard>

          <TiltCard
            interactive
            maxTilt={7}
            onClick={(e) =>
              navigateWithCircularZoom(
                'datasets',
                e.currentTarget,
                { clientX: e.clientX, clientY: e.clientY },
                { accent: 'violet', title: 'Benchmark Schema Explorer' }
              )
            }
            className="rounded-xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-holo-card p-5"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Benchmark Schema Size
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
              <AnimatedCounter value={totalBenchmarkSamples} />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: '94%' }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Reference records across 3 datasets
            </div>
          </TiltCard>

          <TiltCard
            interactive
            maxTilt={7}
            onClick={(e) =>
              user
                ? navigateWithCircularZoom(
                    'performance',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'violet', title: 'Evaluation & History' }
                  )
                : onOpenAuthModal()
            }
            className="rounded-xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-holo-card p-5"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {user ? 'Saved Personal Runs' : 'Synthetic Demo Runs'}
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-violet-700 dark:text-violet-300">
              <AnimatedCounter value={user ? predictions.length : syntheticHistory.length} />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    Math.max(18, (user ? predictions.length : syntheticHistory.length) * 14)
                  )}%`,
                }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {user ? 'Stored privately in your account' : 'Sign in to persist personal runs'}
            </div>
          </TiltCard>
        </section>
      </CinematicSection>

      {/* 4. Chart + Shared-Element Disease Module Cards */}
      <CinematicSection parallaxOffset={16}>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <section className="xl:col-span-7 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-neon-border p-6 mp-glow-hover">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div
                role="tablist"
                aria-label="Dashboard chart perspective"
                className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'balance'}
                  onClick={() => setChartTab('balance')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    chartTab === 'balance'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Class Balance
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'importance'}
                  onClick={() => setChartTab('importance')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    chartTab === 'importance'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Feature Importance
                </button>
              </div>

              <button
                type="button"
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'performance',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'violet', title: 'Model Performance & Comparison' }
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 rounded-md px-2.5 py-1.5 mp-btn-glow whitespace-nowrap"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Model Comparison
              </button>
            </div>

            {chartTab === 'balance' ? (
              <div>
                <div className="mb-3">
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Reference Dataset Class Balance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Standard benchmark target distribution across each independent dataset schema
                  </p>
                </div>
                <DatasetComparisonChart />
              </div>
            ) : (
              <InteractiveFeatureImportance
                onInspectModule={(diseaseId, el) =>
                  navigateWithCircularZoom(diseaseId, el, undefined, {
                    accent: DISEASE_ACCENT_MAP[diseaseId],
                    title: DISEASE_MODULES[diseaseId].metadata.title,
                  })
                }
              />
            )}
          </section>

          <section className="xl:col-span-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Independent Disease Modules
              </h3>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">
                Click any card to zoom in
              </span>
            </div>

            {DISEASE_LIST.map((mod) => {
              const Icon = DISEASE_ICON_MAP[mod.metadata.id];
              const accent = DISEASE_ACCENT_MAP[mod.metadata.id];
              return (
                <TiltCard
                  key={mod.metadata.id}
                  layoutId={`module-card-${mod.metadata.id}`}
                  interactive
                  maxTilt={6}
                  ariaLabel={`Open ${mod.metadata.title}`}
                  onClick={(e) =>
                    navigateWithCircularZoom(
                      mod.metadata.id,
                      e.currentTarget,
                      { clientX: e.clientX, clientY: e.clientY },
                      { accent, title: mod.metadata.title }
                    )
                  }
                  className="rounded-xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-holo-card p-4 hover:border-cyan-400/70 dark:hover:border-cyan-400/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 via-blue-500/15 to-violet-500/20 border border-cyan-400/30 text-blue-600 dark:text-cyan-300 shadow-[0_0_16px_-4px_rgba(34,211,238,0.45)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                          {mod.metadata.title}
                        </h4>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {mod.metadata.featureCount} features · {mod.metadata.benchmarkRowCount} benchmark rows · Demo Simulator
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {mod.metadata.overview}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-cyan-500/30 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-cyan-300 whitespace-nowrap">
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </TiltCard>
              );
            })}

            {/* Quick Action Bento Pair */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <TiltCard
                interactive
                maxTilt={6}
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'datasets',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'cyan', title: 'Synthetic Data Simulator' }
                  )
                }
                className="rounded-xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-holo-card p-4"
              >
                <Dices className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <div className="mt-2 font-display text-xs font-bold text-slate-900 dark:text-white">
                  Synthetic Simulator
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Generate non-PHI profiles
                </div>
              </TiltCard>

              <TiltCard
                interactive
                maxTilt={6}
                onClick={(e) =>
                  navigateWithCircularZoom(
                    'knowledge',
                    e.currentTarget,
                    { clientX: e.clientX, clientY: e.clientY },
                    { accent: 'violet', title: 'Educational Knowledge Centre' }
                  )
                }
                className="rounded-xl border border-slate-200/90 dark:border-violet-500/20 mp-liquid-glass mp-holo-card p-4"
              >
                <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <div className="mt-2 font-display text-xs font-bold text-slate-900 dark:text-white">
                  Knowledge Centre
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  5-stage ML curriculum
                </div>
              </TiltCard>
            </div>
          </section>
        </div>
      </CinematicSection>

      {/* 5. Prediction History Interface (Per-User Account + Synthetic Demo Data Mode) */}
      <CinematicSection parallaxOffset={14}>
        <section className="rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 mp-liquid-glass mp-neon-border p-6 mp-glow-hover">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <History className="h-5 w-5 text-violet-600 dark:text-cyan-400" />
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Prediction History Explorer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {historyTab === 'synthetic'
                    ? 'Synthetic demonstration runs only (non-PHI) — click Replay to test inputs in a module'
                    : 'Stored separately per signed-in user account for educational review'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Prediction history source"
                className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={historyTab === 'synthetic'}
                  onClick={() => setHistoryTab('synthetic')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    historyTab === 'synthetic'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Synthetic Demo Data
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={historyTab === 'account'}
                  onClick={() => setHistoryTab('account')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    historyTab === 'account'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  My Account ({user ? predictions.length : 0})
                </button>
              </div>

              {!user && (
                <MagneticButton
                  onClick={onOpenAuthModal}
                  className="rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-700 whitespace-nowrap"
                >
                  Sign In to Save Runs
                </MagneticButton>
              )}
            </div>
          </div>

          {historyTab === 'synthetic' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4">Module</th>
                    <th className="py-2.5 pr-4">Synthetic Profile</th>
                    <th className="py-2.5 pr-4">Demonstration Output</th>
                    <th className="py-2.5 pr-4 text-right">Demo Index</th>
                    <th className="py-2.5 pr-4">Recorded</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {syntheticHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-cyan-950/20 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {DISEASE_MODULES[item.diseaseId]?.metadata.shortTitle || item.diseaseId}
                      </td>
                      <td className="py-3 pr-4 text-xs font-medium text-cyan-700 dark:text-cyan-300 whitespace-nowrap">
                        {item.profileName}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                        {item.predictedLabel}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {(item.probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {item.createdAtLabel}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) =>
                            onReloadSyntheticRun(
                              item.diseaseId,
                              item.inputs,
                              item.profileName,
                              e.currentTarget
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-cyan-300/60 dark:border-cyan-500/35 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-cyan-300 hover:bg-blue-50 dark:hover:bg-cyan-950/50 mp-btn-glow"
                        >
                          <Play className="h-3 w-3" />
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !user ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-6 text-center text-sm text-slate-600 dark:text-slate-300">
              Sign in with your account to automatically persist and review your Heart Disease,
              Diabetes, and Breast Cancer simulation history separately from other learners.
            </div>
          ) : predictionsLoading ? (
            <LoadingRowsSkeleton rows={3} />
          ) : predictions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-6 text-center text-sm text-slate-600 dark:text-slate-300">
              No simulation runs saved yet. Open any disease prediction module and run a demo
              simulation to store it in your personal history.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4">Module</th>
                    <th className="py-2.5 pr-4">Demonstration Output</th>
                    <th className="py-2.5 pr-4 text-right">Demo Index</th>
                    <th className="py-2.5 pr-4">Mode</th>
                    <th className="py-2.5 pr-4">Recorded</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {predictions.slice(0, 8).map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {DISEASE_MODULES[item.diseaseId]?.metadata.shortTitle || item.diseaseId}
                      </td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                        {item.predictedLabel}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {(item.probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.isTrainedModel ? 'Scikit-learn API' : 'Educational Demo'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(item.createdAtMs).toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeletePrediction(user.uid, item.id)}
                          aria-label="Delete saved prediction"
                          className="inline-flex items-center gap-1 rounded-md p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CinematicSection>
    </div>
  );
}
