import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onIdTokenChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  AuthSessionStatus,
  classifyFirebaseError,
  resolveAuthSession,
} from '../services/authPolicy';
import {
  ensureUserProfile,
  StoredPredictionRecord,
  subscribeUserPredictions,
  UserProfileDoc,
} from '../services/firestoreService';

interface AuthContextValue {
  user: User | null;
  profile: UserProfileDoc | null;
  loading: boolean;
  authStatus: AuthSessionStatus;
  isAdmin: boolean;
  authError: string | null;
  predictions: StoredPredictionRecord[];
  predictionsLoading: boolean;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authStatus, setAuthStatus] = useState<AuthSessionStatus>('signed_out');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<StoredPredictionRecord[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState<boolean>(false);

  const resetToExpiredOrSignedOut = useCallback(
    async (status: 'signed_out' | 'session_expired', message: string | null) => {
      setUser(null);
      setProfile(null);
      setPredictions([]);
      setPredictionsLoading(false);
      setIsAdmin(false);
      setAuthStatus(status);
      setAuthError(message);
      if (status === 'session_expired' && auth.currentUser) {
        try {
          await signOut(auth);
        } catch {
          // Ignore sign-out cleanup errors when token is already invalidated
        }
      }
    },
    []
  );

  useEffect(() => {
    let unsubPredictions: (() => void) | null = null;
    let activeRunId = 0;

    const unsubAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      const runId = ++activeRunId;

      if (unsubPredictions) {
        unsubPredictions();
        unsubPredictions = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setPredictions([]);
        setPredictionsLoading(false);
        setIsAdmin(false);
        setAuthStatus((prev) => (prev === 'session_expired' ? 'session_expired' : 'signed_out'));
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setPredictionsLoading(true);

      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (runId !== activeRunId) return;

        const policy = resolveAuthSession(
          { uid: firebaseUser.uid, emailVerified: firebaseUser.emailVerified },
          tokenResult.claims
        );
        setAuthStatus(policy.status);
        setIsAdmin(policy.isAdmin);

        if (!policy.canAccessFirestore) {
          setProfile(null);
          setPredictions([]);
          setPredictionsLoading(false);
          setAuthError(
            'Your account email is not verified. Please sign in with a verified Google account to access saved predictions and feedback.'
          );
          setLoading(false);
          return;
        }

        setAuthError(null);
        const ensured = await ensureUserProfile(firebaseUser);
        if (runId !== activeRunId) return;
        setProfile(ensured);

        unsubPredictions = subscribeUserPredictions(
          firebaseUser.uid,
          (records) => {
            setPredictions(records);
            setPredictionsLoading(false);
          },
          (err) => {
            const classified = classifyFirebaseError(err);
            setPredictionsLoading(false);
            if (classified.shouldClearSession) {
              void resetToExpiredOrSignedOut('session_expired', classified.userMessage);
            } else {
              setAuthError(classified.userMessage);
            }
          }
        );
      } catch (err) {
        if (runId !== activeRunId) return;
        const classified = classifyFirebaseError(err);
        setPredictionsLoading(false);
        if (classified.shouldClearSession) {
          await resetToExpiredOrSignedOut('session_expired', classified.userMessage);
        } else {
          setIsAdmin(false);
          setAuthError(classified.userMessage);
        }
      } finally {
        if (runId === activeRunId) {
          setLoading(false);
        }
      }
    });

    return () => {
      activeRunId += 1;
      unsubAuth();
      if (unsubPredictions) unsubPredictions();
    };
  }, [resetToExpiredOrSignedOut]);

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      const classified = classifyFirebaseError(err);
      if (classified.kind !== 'popup_closed') {
        setAuthError(classified.userMessage);
      }
      return false;
    }
  };

  const refreshSession = useCallback(async () => {
    if (!auth.currentUser) {
      setAuthStatus('signed_out');
      setIsAdmin(false);
      return;
    }
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const policy = resolveAuthSession(
        { uid: auth.currentUser.uid, emailVerified: auth.currentUser.emailVerified },
        tokenResult.claims
      );
      setAuthStatus(policy.status);
      setIsAdmin(policy.isAdmin);
      if (!policy.canAccessFirestore) {
        setAuthError(
          'Your account email is not verified. Please sign in with a verified Google account.'
        );
      } else {
        setAuthError(null);
      }
    } catch (err) {
      const classified = classifyFirebaseError(err);
      if (classified.shouldClearSession) {
        await resetToExpiredOrSignedOut('session_expired', classified.userMessage);
      } else {
        setAuthError(classified.userMessage);
      }
    }
  }, [resetToExpiredOrSignedOut]);

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
      setAuthStatus('signed_out');
      setIsAdmin(false);
    } catch (err) {
      const classified = classifyFirebaseError(err);
      setAuthError(classified.userMessage);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authStatus,
      isAdmin,
      authError,
      predictions,
      predictionsLoading,
      signInWithGoogle,
      logout,
      refreshSession,
      clearAuthError: () => setAuthError(null),
    }),
    [
      user,
      profile,
      loading,
      authStatus,
      isAdmin,
      authError,
      predictions,
      predictionsLoading,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
