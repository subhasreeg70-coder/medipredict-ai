import { useState } from 'react';
import { AlertTriangle, Lock, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../common/LoadingIndicator';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const {
    user,
    authStatus,
    isAdmin,
    signInWithGoogle,
    logout,
    refreshSession,
    authError,
    clearAuthError,
  } = useAuth();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      const succeeded = await signInWithGoogle();
      if (succeeded) {
        showToast({
          title: 'Signed in with Google',
          description: 'Your personal prediction history workspace is active.',
          variant: 'success',
        });
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshSession = async () => {
    setRefreshing(true);
    try {
      await refreshSession();
      showToast({
        title: 'Session claims refreshed',
        description: 'Checked latest verified token status and permissions.',
        variant: 'info',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast({
      title: 'Signed out',
      description: 'You have logged out of MEDIPREDICT AI.',
      variant: 'info',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 dark:bg-slate-950/75 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="auth-modal-title"
                  className="font-display text-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  {user ? 'Account Session' : 'Sign In with Google'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {user
                    ? 'Your educational prediction history and feedback entries are isolated to your account.'
                    : 'Sign in using your Google account to save prediction runs and submit feedback.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAuthError();
                  onClose();
                }}
                aria-label="Close authentication modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {authStatus === 'session_expired' && !user && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  Your previous session expired or was revoked. Sign in again with Google to
                  resume access.
                </span>
              </div>
            )}

            {authError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
              >
                {authError}
              </div>
            )}

            {user ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Google Account Session
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        authStatus === 'unverified_email'
                          ? 'text-amber-600 dark:text-amber-400'
                          : isAdmin
                          ? 'text-violet-700 dark:text-cyan-300'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {authStatus === 'unverified_email'
                        ? 'Unverified Email'
                        : isAdmin
                        ? 'Verified Admin Claim'
                        : 'Verified Learner'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {user.displayName || 'Learner Account'}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {user.email}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={refreshing}
                    onClick={() => void handleRefreshSession()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 mp-btn-glow transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Token
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 mp-btn-glow transition-colors"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleGoogleSignIn()}
                  className="w-full flex items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70 mp-btn-glow transition-colors"
                >
                  {submitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {submitting ? 'Signing in with Google...' : 'Continue with Google'}
                </button>

                <div className="rounded-lg border border-blue-100 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <span>
                    Google Sign-In is the only authentication method supported (email/password
                    login is not enabled). First-time Google sign-in automatically creates your
                    isolated learner workspace.
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
