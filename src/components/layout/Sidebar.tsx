import {
  Activity,
  BarChart3,
  Database,
  Droplets,
  GraduationCap,
  HeartPulse,
  Info,
  LayoutDashboard,
  MessageSquareText,
  Microscope,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppView } from '../../types/ml';

export type ExtendedNavView = AppView;

interface SidebarProps {
  activeView: ExtendedNavView;
  onSelectView: (view: ExtendedNavView, sourceEl?: HTMLElement | null) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ExtendedNavView;
  label: string;
  section: 'overview' | 'models' | 'analysis' | 'project';
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home Dashboard', section: 'overview', icon: LayoutDashboard },
  { id: 'heart', label: 'Heart Disease', section: 'models', icon: HeartPulse },
  { id: 'diabetes', label: 'Diabetes', section: 'models', icon: Droplets },
  { id: 'breast-cancer', label: 'Breast Cancer', section: 'models', icon: Microscope },
  { id: 'datasets', label: 'Dataset Explorer', section: 'analysis', icon: Database },
  { id: 'performance', label: 'Model Performance', section: 'analysis', icon: BarChart3 },
  { id: 'knowledge', label: 'Knowledge Centre', section: 'analysis', icon: GraduationCap },
  { id: 'feedback', label: 'Feedback & Review', section: 'project', icon: MessageSquareText },
  { id: 'about', label: 'About & Disclaimer', section: 'project', icon: Info },
];

const SECTION_TITLES: Record<NavItem['section'], string> = {
  overview: 'Workspace',
  models: 'Disease Modules',
  analysis: 'Data & Learning',
  project: 'Governance',
};

export function Sidebar({
  activeView,
  onSelectView,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const sections: NavItem['section'][] = ['overview', 'models', 'analysis', 'project'];

  const renderNavContent = (isMobile = false) => (
    <div className="flex h-full flex-col bg-white/95 dark:bg-[#060d24]/92 backdrop-blur-xl border-r border-slate-200/90 dark:border-cyan-500/15 transition-colors duration-300">
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={(e) => {
            onSelectView('home', e.currentTarget);
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-cyan-500 rounded-lg mp-btn-glow p-1 -m-1"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 text-white shadow-[0_0_20px_-2px_rgba(34,211,238,0.6)]">
            <Activity className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            MEDIPREDICT AI
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((sec) => {
          const items = NAV_ITEMS.filter((item) => item.section === sec);
          return (
            <div key={sec}>
              <div className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                {SECTION_TITLES[sec]}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        onSelectView(item.id, e.currentTarget);
                        onCloseMobile();
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 via-cyan-50/75 to-violet-50 dark:from-cyan-500/15 dark:via-blue-600/15 dark:to-violet-600/20 text-blue-700 dark:text-cyan-300 border border-cyan-300/70 dark:border-cyan-400/50 mp-sidebar-active-glow'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent mp-btn-glow'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={isMobile ? 'sidebar-glow-bar-mobile' : 'sidebar-glow-bar'}
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 to-violet-500 shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                        />
                      )}
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.65)]'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 dark:border-slate-800/80 px-5 py-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        <div className="font-medium text-slate-700 dark:text-slate-200">Educational Sandbox</div>
        <div className="mt-0.5">Non-clinical ML demo · No PHI</div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {renderNavContent(false)}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-slate-900/50 dark:bg-[#030714]/80 backdrop-blur-xs"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative z-10 w-72 max-w-[85vw] h-full"
            >
              {renderNavContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
