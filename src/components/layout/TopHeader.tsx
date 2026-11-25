import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useNavigationTransition } from '../../context/NavigationTransitionContext';
import { useSound } from '../../context/SoundContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { KNOWLEDGE_MODULES } from '../../data/knowledgeCentreData';
import { ML_GLOSSARY } from '../../data/mlGlossary';
import { DISEASE_LIST } from '../../modules/registry';
import { AppView } from '../../types/ml';
import { LoadingSpinner } from '../common/LoadingIndicator';

interface TopHeaderProps {
  activeView: AppView;
  onOpenMobileMenu: () => void;
  onOpenAuthModal: () => void;
}

const VIEW_TITLES: Record<AppView, string> = {
  home: 'Home Dashboard',
  heart: 'Heart Disease Prediction',
  diabetes: 'Diabetes Prediction',
  'breast-cancer': 'Breast Cancer Prediction',
  datasets: 'Dataset Explorer & Simulator',
  performance: 'Model Performance & Comparison',
  knowledge: 'Educational Knowledge Centre',
  feedback: 'Feedback & Review',
  about: 'About & Medical Disclaimer',
};

interface SearchResultItem {
  id: string;
  label: string;
  category: string;
  targetView: AppView;
}

export function TopHeader({
  activeView,
  onOpenMobileMenu,
  onOpenAuthModal,
}: TopHeaderProps) {
  const { user, loading, logout } = useAuth();
  const { theme, isDark, setTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const { showToast } = useToast();
  const { navigateWithCircularZoom, zoomOutToDashboard } = useNavigationTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const searchIndex = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [
      { id: 'v-home', label: 'Home Dashboard', category: 'Workspace', targetView: 'home' },
      { id: 'v-datasets', label: 'Dataset Explorer & Synthetic Simulator', category: 'Data & Learning', targetView: 'datasets' },
      { id: 'v-perf', label: 'Model Performance & Comparison', category: 'Data & Learning', targetView: 'performance' },
      { id: 'v-knowledge', label: 'Educational Knowledge Centre', category: 'Data & Learning', targetView: 'knowledge' },
      { id: 'v-feedback', label: 'Feedback & Review', category: 'Governance', targetView: 'feedback' },
      { id: 'v-about', label: 'About & Medical Disclaimer', category: 'Governance', targetView: 'about' },
    ];

    DISEASE_LIST.forEach((mod) => {
      items.push({
        id: `m-${mod.metadata.id}`,
        label: mod.metadata.title,
        category: 'Disease Module',
        targetView: mod.metadata.id,
      });
      mod.features.forEach((f) => {
        items.push({
          id: `f-${mod.metadata.id}-${f.key}`,
          label: `${f.label} (${mod.metadata.shortTitle})`,
          category: 'Input Feature',
          targetView: mod.metadata.id,
        });
      });
    });

    Object.entries(ML_GLOSSARY).forEach(([key, entry]) => {
      items.push({
        id: `g-${key}`,
        label: entry.term,
        category: 'ML Metric / Concept',
        targetView: 'performance',
      });
    });

    KNOWLEDGE_MODULES.forEach((stage) => {
      items.push({
        id: `k-${stage.id}`,
        label: stage.title,
        category: `Knowledge Stage ${stage.stageNumber}`,
        targetView: 'knowledge',
      });
    });

    return items;
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchIndex.slice(0, 6);
    return searchIndex
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
      .slice(0, 7);
  }, [searchQuery, searchIndex]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSelectTheme = (targetMode: 'dark' | 'light') => {
    if (targetMode === theme) return;
    setTheme(targetMode);
    showToast({
      title: `Switched to ${targetMode === 'dark' ? 'Dark Mode' : 'Light Mode'}`,
      description: 'Global interface theme updated.',
      variant: 'info',
    });
  };

  const handleToggleSound = () => {
    const nextEnabled = !soundEnabled;
    toggleSound();
    showToast({
      title: nextEnabled ? 'Lab UI Sound Enabled' : 'Lab UI Sound Muted',
      description: nextEnabled
        ? 'Subtle futuristic audio cues are active.'
        : 'All interface audio cues are muted.',
      variant: 'info',
    });
  };

  const handleLogout = async () => {
    await logout();
    showToast({
      title: 'Signed out',
      description: 'Your session has been closed safely.',
      variant: 'info',
    });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/90 dark:border-cyan-500/15 bg-white/90 dark:bg-[#050b1c]/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 mp-btn-glow"
        >
          <Menu className="h-5 w-5" />
        </button>

        {activeView !== 'home' && (
          <button
            type="button"
            onClick={(e) => zoomOutToDashboard(e.currentTarget)}
            title="Zoom back to Home Dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/60 dark:border-cyan-500/35 bg-cyan-50/70 dark:bg-cyan-950/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 mp-btn-glow whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-sm min-w-0">
          <button
            type="button"
            onClick={(e) => zoomOutToDashboard(e.currentTarget)}
            className="hidden xl:inline text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 rounded px-1 -mx-1"
          >
            MEDIPREDICT AI
          </button>
          <span className="hidden xl:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-sm sm:text-base lg:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {VIEW_TITLES[activeView]}
          </h1>
        </div>
      </div>

      {/* Animated Focus Search + Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div ref={searchBoxRef} className="relative hidden md:block">
          <div
            className={`relative flex items-center rounded-xl border transition-all duration-200 ${
              searchFocused
                ? 'w-72 border-cyan-400 bg-white dark:bg-slate-900/95 shadow-[0_0_20px_-4px_rgba(34,211,238,0.45)]'
                : 'w-52 border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/60'
            }`}
          >
            <Search
              className={`pointer-events-none ml-3 h-3.5 w-3.5 shrink-0 transition-colors ${
                searchFocused ? 'text-cyan-500' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules, metrics..."
              aria-label="Search modules, features, and ML metrics"
              className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="mr-2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {searchFocused && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-cyan-500/30 bg-white dark:bg-[#081026] shadow-2xl overflow-hidden z-50"
              >
                <div className="px-3 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  {searchQuery ? 'Matching Modules & Concepts' : 'Quick Jump Destinations'}
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                    No matching modules or metrics found.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={(e) => {
                          setSearchFocused(false);
                          setSearchQuery('');
                          navigateWithCircularZoom(res.targetView, e.currentTarget, undefined, {
                            accent: 'cyan',
                            title: res.label,
                          });
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-blue-50/70 dark:hover:bg-cyan-950/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {res.label}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {res.category}
                          </div>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={soundEnabled ? 'Mute UI sound effects' : 'Enable UI sound effects'}
          aria-pressed={soundEnabled}
          title={soundEnabled ? 'Mute futuristic UI sound cues' : 'Enable subtle UI sound cues'}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium mp-btn-glow whitespace-nowrap shrink-0 transition-colors ${
            soundEnabled
              ? 'border-cyan-400/50 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80'
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span className="hidden xl:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
        </button>

        <div
          role="group"
          aria-label="Color theme mode"
          className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-900/90 p-0.5 shrink-0"
        >
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            aria-label="Dark Mode"
            aria-pressed={isDark}
            title="Dark Mode"
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              isDark
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/40'
                : 'text-slate-600 hover:text-slate-900 border border-transparent'
            }`}
          >
            <Moon className={`h-3.5 w-3.5 ${isDark ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            aria-label="Light Mode"
            aria-pressed={!isDark}
            title="Light Mode"
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              !isDark
                ? 'bg-white text-amber-700 shadow-sm border border-amber-300/80'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Sun className={`h-3.5 w-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Light</span>
          </button>
        </div>

        {loading ? (
          <LoadingSpinner size="sm" label="Checking session..." />
        ) : user ? (
          <div className="flex items-center gap-2.5">
            <div className="hidden xl:block text-right">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                {user.displayName || 'Signed-in Learner'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white mp-btn-glow whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              Log Out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:from-cyan-500 hover:to-blue-600 mp-btn-glow whitespace-nowrap shrink-0"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>
    </header>
  );
}
