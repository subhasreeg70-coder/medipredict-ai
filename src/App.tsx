import { useCallback, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { WorkflowAssistantPanel } from './components/assistant/WorkflowAssistantPanel';
import { AuthModal } from './components/auth/AuthModal';
import { NeuralBackdrop } from './components/background/NeuralBackdrop';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RippleManager } from './components/common/RippleManager';
import { CinematicSpotlight } from './components/interactive/CinematicSpotlight';
import { GravityCursorField } from './components/interactive/GravityCursorField';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { AboutDisclaimerView } from './components/views/AboutDisclaimerView';
import { DatasetExplorerView } from './components/views/DatasetExplorerView';
import { DiseasePredictionView } from './components/views/DiseasePredictionView';
import { FeedbackView } from './components/views/FeedbackView';
import { HomeDashboard } from './components/views/HomeDashboard';
import { KnowledgeCentreView } from './components/views/KnowledgeCentreView';
import { ModelPerformanceView } from './components/views/ModelPerformanceView';
import { AuthProvider } from './context/AuthContext';
import {
  NavigationTransitionProvider,
  useNavigationTransition,
  ZoomAccent,
} from './context/NavigationTransitionContext';
import { SoundProvider } from './context/SoundContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import {
  buildInitialSyntheticHistory,
  SyntheticDemoHistoryItem,
} from './data/featureImportanceData';
import { DISEASE_MODULES } from './modules/registry';
import { BackendConnectionConfig, getDefaultBackendConfig } from './services/mlClient';
import { DiseaseId, PredictionResult, SyntheticPrefillPayload } from './types/ml';

const ACCENT_BY_DISEASE: Record<DiseaseId, ZoomAccent> = {
  heart: 'cyan',
  diabetes: 'blue',
  'breast-cancer': 'violet',
};

function AppShell() {
  const { activeView, transitionDirection, navigateToView, navigateWithCircularZoom } =
    useNavigationTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [backendConfig, setBackendConfig] = useState<BackendConnectionConfig>(() =>
    getDefaultBackendConfig()
  );
  const [prefillPayload, setPrefillPayload] = useState<SyntheticPrefillPayload | null>(null);
  const [syntheticHistory, setSyntheticHistory] = useState<SyntheticDemoHistoryItem[]>(() =>
    buildInitialSyntheticHistory()
  );

  const handleLaunchSyntheticInPredictor = useCallback(
    (
      diseaseId: DiseaseId,
      inputs: Record<string, number>,
      label: string,
      sourceEl?: HTMLElement | null
    ) => {
      setPrefillPayload({
        diseaseId,
        inputs: { ...inputs },
        label,
        nonce: Date.now(),
      });
      navigateWithCircularZoom(diseaseId, sourceEl, undefined, {
        accent: ACCENT_BY_DISEASE[diseaseId],
        title: DISEASE_MODULES[diseaseId].metadata.title,
      });
    },
    [navigateWithCircularZoom]
  );

  const handleRecordSyntheticRun = useCallback(
    (
      diseaseId: DiseaseId,
      inputs: Record<string, number>,
      result: PredictionResult,
      profileName: string
    ) => {
      setSyntheticHistory((prev) => [
        {
          id: `syn-run-${Date.now()}`,
          diseaseId,
          profileName,
          predictedLabel: result.predictedLabel,
          probability: result.probability,
          riskTier: result.riskTier,
          createdAtLabel: 'Just now (Synthetic)',
          inputs: { ...inputs },
        },
        ...prev.slice(0, 9),
      ]);
    },
    []
  );

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return (
          <HomeDashboard
            onOpenAuthModal={() => setAuthModalOpen(true)}
            syntheticHistory={syntheticHistory}
            onReloadSyntheticRun={handleLaunchSyntheticInPredictor}
          />
        );
      case 'heart':
      case 'diabetes':
      case 'breast-cancer':
        return (
          <DiseasePredictionView
            diseaseId={activeView}
            backendConfig={backendConfig}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            prefillPayload={prefillPayload}
            onRecordSyntheticRun={handleRecordSyntheticRun}
          />
        );
      case 'datasets':
        return (
          <DatasetExplorerView
            onLaunchSyntheticInPredictor={handleLaunchSyntheticInPredictor}
          />
        );
      case 'performance':
        return (
          <ModelPerformanceView
            backendConfig={backendConfig}
            onChangeBackendConfig={setBackendConfig}
          />
        );
      case 'knowledge':
        return <KnowledgeCentreView />;
      case 'feedback':
        return <FeedbackView onOpenAuthModal={() => setAuthModalOpen(true)} />;
      case 'about':
        return <AboutDisclaimerView />;
      default:
        return (
          <HomeDashboard
            onOpenAuthModal={() => setAuthModalOpen(true)}
            syntheticHistory={syntheticHistory}
            onReloadSyntheticRun={handleLaunchSyntheticInPredictor}
          />
        );
    }
  };

  const prefersReducedMotion = useReducedMotion();

  const pageInitial = prefersReducedMotion
    ? { opacity: 0 }
    : transitionDirection === 'zoom-in'
    ? { opacity: 0, scale: 0.96, y: 10, filter: 'blur(8px)' }
    : transitionDirection === 'zoom-out'
    ? { opacity: 0, scale: 1.03, y: 0, filter: 'blur(6px)' }
    : { opacity: 0, y: 12, filter: 'blur(8px)' };

  const pageAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' };

  const pageExit = prefersReducedMotion
    ? { opacity: 0 }
    : transitionDirection === 'zoom-out'
    ? { opacity: 0, scale: 0.95, filter: 'blur(6px)' }
    : { opacity: 0, y: -6, filter: 'blur(6px)' };

  return (
    <div className="relative min-h-screen flex bg-slate-50 dark:bg-[#030714] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <NeuralBackdrop />
      <CinematicSpotlight />
      <GravityCursorField />
      <RippleManager />

      <Sidebar
        activeView={activeView}
        onSelectView={(view, el) => {
          if (view === 'heart' || view === 'diabetes' || view === 'breast-cancer') {
            navigateWithCircularZoom(view, el, undefined, {
              accent: ACCENT_BY_DISEASE[view],
              title: DISEASE_MODULES[view].metadata.title,
            });
          } else {
            navigateToView(view);
          }
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <TopHeader
          activeView={activeView}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1360px] w-full mx-auto pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={pageInitial}
              animate={pageAnimate}
              exit={pageExit}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t border-slate-200/80 dark:border-cyan-500/15 bg-white/85 dark:bg-[#050b1c]/85 backdrop-blur-md px-4 py-4 sm:px-6 lg:px-8 transition-colors">
          <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>MEDIPREDICT AI · Educational Healthcare Machine Learning Sandbox</div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigateToView('knowledge')}
                className="hover:text-slate-900 dark:hover:text-cyan-300 transition-colors rounded px-1.5 py-0.5"
              >
                Knowledge Centre
              </button>
              <button
                type="button"
                onClick={() => navigateToView('feedback')}
                className="hover:text-slate-900 dark:hover:text-cyan-300 transition-colors rounded px-1.5 py-0.5"
              >
                Feedback
              </button>
              <button
                type="button"
                onClick={() => navigateToView('about')}
                className="hover:text-slate-900 dark:hover:text-cyan-300 transition-colors rounded px-1.5 py-0.5"
              >
                Medical Disclaimer
              </button>
            </div>
          </div>
        </footer>
      </div>

      <WorkflowAssistantPanel />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <SoundProvider>
            <AuthProvider>
              <NavigationTransitionProvider>
                <AppShell />
              </NavigationTransitionProvider>
            </AuthProvider>
          </SoundProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
