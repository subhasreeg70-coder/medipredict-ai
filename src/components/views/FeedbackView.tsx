import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, MessageSquarePlus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { classifyFirebaseError } from '../../services/authPolicy';
import {
  deleteFeedbackEntry,
  FeedbackCategory,
  FeedbackModuleArea,
  FeedbackStatus,
  StoredFeedbackEntry,
  submitFeedbackEntry,
  subscribeFeedbackEntries,
  updateFeedbackStatus,
} from '../../services/firestoreService';
import { LoadingRowsSkeleton, LoadingSpinner } from '../common/LoadingIndicator';

interface FeedbackViewProps {
  onOpenAuthModal: () => void;
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  comment: 'Comment',
  suggestion: 'Suggestion',
  issue: 'Report Issue',
};

const MODULE_LABELS: Record<FeedbackModuleArea, string> = {
  general: 'General Dashboard',
  heart: 'Heart Disease Module',
  diabetes: 'Diabetes Module',
  'breast-cancer': 'Breast Cancer Module',
  datasets: 'Dataset Explorer',
  performance: 'Model Performance',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
};

export function FeedbackView({ onOpenAuthModal }: FeedbackViewProps) {
  const { user, authStatus, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [moduleArea, setModuleArea] = useState<FeedbackModuleArea>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [entries, setEntries] = useState<StoredFeedbackEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');

  const isVerifiedSignedIn = Boolean(user && authStatus === 'authenticated');

  useEffect(() => {
    if (!user || authStatus !== 'authenticated') {
      setEntries([]);
      setEntriesError(null);
      setEntriesLoading(false);
      return;
    }

    setEntriesLoading(true);
    setEntriesError(null);
    const unsubscribe = subscribeFeedbackEntries(
      user,
      isAdmin,
      (items) => {
        setEntries(items);
        setEntriesError(null);
        setEntriesLoading(false);
      },
      (err) => {
        const classified = classifyFirebaseError(err);
        setEntriesError(classified.userMessage);
        setEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authStatus, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || authStatus !== 'authenticated') {
      onOpenAuthModal();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await submitFeedbackEntry({
        user,
        category,
        moduleArea,
        subject,
        message,
      });
      setSubject('');
      setMessage('');
      setSubmitSuccess('Thank you! Your feedback entry has been stored under your account.');
      showToast({
        title: 'Feedback submitted',
        description: 'Stored in Firestore for review.',
        variant: 'success',
      });
    } catch (err) {
      const classified = classifyFirebaseError(err);
      setSubmitError(classified.userMessage);
      showToast({
        title: classified.kind === 'unauthorized' ? 'Unauthorized action' : 'Submission error',
        description: classified.userMessage,
        variant: 'warning',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: FeedbackStatus) => {
    if (!isAdmin) {
      showToast({
        title: 'Unauthorized',
        description: 'Only users with a verified Firebase admin claim can update feedback status.',
        variant: 'warning',
      });
      return;
    }
    try {
      await updateFeedbackStatus(id, nextStatus);
      showToast({
        title: `Feedback marked ${STATUS_LABELS[nextStatus]}`,
        variant: 'info',
      });
    } catch (err) {
      const classified = classifyFirebaseError(err);
      showToast({
        title: classified.kind === 'unauthorized' ? 'Unauthorized' : 'Status update failed',
        description: classified.userMessage,
        variant: 'warning',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeedbackEntry(id);
      showToast({
        title: 'Feedback entry deleted',
        variant: 'info',
      });
    } catch (err) {
      const classified = classifyFirebaseError(err);
      showToast({
        title: classified.kind === 'unauthorized' ? 'Unauthorized' : 'Delete failed',
        description: classified.userMessage,
        variant: 'warning',
      });
    }
  };

  const filteredEntries =
    statusFilter === 'all'
      ? entries
      : entries.filter((item) => item.status === statusFilter);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 mp-glass-panel p-6 mp-glow-hover">
        <div className="text-xs font-medium text-blue-700 dark:text-cyan-400">
          Community & Learner Feedback · Stored in Firestore for Review
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
          Feedback & Issue Reporting
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
          Share comments, suggest new educational visualizations, or report any UI or calculation
          issues. Do not include any personal or patient health information.
        </p>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Submission Form */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="xl:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 mp-glass-panel p-6 space-y-4 mp-glow-hover"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <MessageSquarePlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Submit Feedback Entry
            </h3>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Feedback Type
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {(['comment', 'suggestion', 'issue'] as FeedbackCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    category === cat
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="feedback-module"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Related Module
            </label>
            <select
              id="feedback-module"
              value={moduleArea}
              onChange={(e) => setModuleArea(e.target.value as FeedbackModuleArea)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {(Object.keys(MODULE_LABELS) as FeedbackModuleArea[]).map((key) => (
                <option key={key} value={key}>
                  {MODULE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="feedback-subject"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject
            </label>
            <input
              id="feedback-subject"
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary (3–120 characters)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Details
            </label>
            <textarea
              id="feedback-message"
              required
              minLength={5}
              maxLength={1500}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your comment, suggestion, or steps to reproduce an issue..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none resize-y"
            />
            <div className="mt-1 text-right font-mono text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              {message.length}/1500
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {submitSuccess}
            </div>
          )}

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 mp-btn-glow transition-all"
            >
              <Lock className="h-4 w-4" />
              {authStatus === 'session_expired'
                ? 'Session Expired — Sign In Again with Google'
                : 'Sign In with Google to Submit Feedback'}
            </button>
          ) : authStatus === 'unverified_email' ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
            >
              A verified Google account email is required before submitting feedback.
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-violet-700 disabled:opacity-60 mp-btn-glow transition-all"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          )}
        </form>

        {/* Stored Feedback Review Queue */}
        <section className="xl:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mp-glow-hover">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {isAdmin
                    ? 'All Feedback Entries (Admin Review Queue)'
                    : 'My Submitted Feedback (Private to Your Account)'}
                </h3>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300/60 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:text-cyan-300">
                    <ShieldCheck className="h-3 w-3" />
                    Admin Claim Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Verified administrator view: review submissions across learners and update triage status.'
                  : 'Only feedback entries submitted by your account are shown here. Other users cannot view them.'}
              </p>
            </div>

            {isVerifiedSignedIn && (
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                {(['all', 'new', 'reviewed', 'resolved'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'All' : STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!user ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-6 text-center text-sm text-slate-600 dark:text-slate-300">
              {authStatus === 'session_expired'
                ? 'Your sign-in session expired. Sign in again with Google to view your submitted feedback.'
                : 'Sign in with Google to submit feedback and track only your own submitted entries.'}
            </div>
          ) : authStatus === 'unverified_email' ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Your account email is not verified. Firestore feedback access is blocked until you
                sign in with a verified Google account.
              </span>
            </div>
          ) : entriesLoading ? (
            <div className="mt-4">
              <LoadingRowsSkeleton rows={3} />
            </div>
          ) : entriesError ? (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200"
            >
              {entriesError}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-6 text-center text-sm text-slate-600 dark:text-slate-300">
              No feedback entries match this view yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredEntries.map((item) => (
                <article
                  key={item.id}
                  data-ripple="true"
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 p-4 mp-glow-hover"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {CATEGORY_LABELS[item.category]} · {MODULE_LABELS[item.moduleArea]} · Status:{' '}
                        <span
                          className={`font-semibold ${
                            item.status === 'resolved'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : item.status === 'reviewed'
                              ? 'text-blue-700 dark:text-cyan-400'
                              : 'text-violet-700 dark:text-violet-400'
                          }`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <h4 className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.subject}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <select
                          aria-label={`Change status for ${item.subject}`}
                          value={item.status}
                          onChange={(e) =>
                            void handleStatusChange(item.id, e.target.value as FeedbackStatus)
                          }
                          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        aria-label="Delete feedback entry"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>

                  <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    Submitted by {item.userDisplayName} ·{' '}
                    {new Date(item.createdAtMs).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
