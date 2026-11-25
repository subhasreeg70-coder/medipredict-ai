export type AuthSessionStatus =
  | 'signed_out'
  | 'unverified_email'
  | 'authenticated'
  | 'session_expired';

export interface AuthPrincipal {
  uid: string;
  emailVerified: boolean;
}

export interface AuthSessionPolicy {
  status: AuthSessionStatus;
  isAdmin: boolean;
  canAccessFirestore: boolean;
}

export type FirebaseErrorKind =
  | 'popup_closed'
  | 'popup_blocked'
  | 'session_expired'
  | 'unauthorized'
  | 'missing_index'
  | 'network'
  | 'unknown';

export interface ClassifiedFirebaseError {
  kind: FirebaseErrorKind;
  userMessage: string;
  shouldClearSession: boolean;
}

/**
 * Derives authorization exclusively from Firebase Auth verification status and
 * server-issued custom claims (`claims.admin === true`). Never checks email strings.
 */
export function resolveAuthSession(
  principal: AuthPrincipal | null,
  claims?: Record<string, unknown> | null
): AuthSessionPolicy {
  if (!principal || !principal.uid) {
    return {
      status: 'signed_out',
      isAdmin: false,
      canAccessFirestore: false,
    };
  }

  if (principal.emailVerified !== true) {
    return {
      status: 'unverified_email',
      isAdmin: false,
      canAccessFirestore: false,
    };
  }

  return {
    status: 'authenticated',
    isAdmin: claims?.admin === true,
    canAccessFirestore: true,
  };
}

export function canSubmitFeedback(policy: AuthSessionPolicy): boolean {
  return policy.status === 'authenticated' && policy.canAccessFirestore;
}

export function canModerateFeedback(policy: AuthSessionPolicy): boolean {
  return policy.status === 'authenticated' && policy.isAdmin === true;
}

export function canViewFeedbackEntry(
  policy: AuthSessionPolicy,
  viewerUid: string | null | undefined,
  entryOwnerUid: string
): boolean {
  if (policy.status !== 'authenticated' || !policy.canAccessFirestore) {
    return false;
  }
  if (policy.isAdmin) {
    return true;
  }
  return Boolean(viewerUid) && viewerUid === entryOwnerUid;
}

function unwrapErrorMessage(error: unknown): { code: string; message: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');

  if (rawMessage.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMessage) as { error?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        return { code, message: parsed.error };
      }
    } catch {
      // Keep rawMessage when not valid JSON
    }
  }

  return { code, message: rawMessage };
}

export function classifyFirebaseError(error: unknown): ClassifiedFirebaseError {
  const { code, message } = unwrapErrorMessage(error);
  const haystack = `${code} ${message}`.toLowerCase();

  if (
    haystack.includes('popup-closed-by-user') ||
    haystack.includes('cancelled-popup-request')
  ) {
    return {
      kind: 'popup_closed',
      userMessage: 'Google sign-in was cancelled before completion.',
      shouldClearSession: false,
    };
  }

  if (haystack.includes('popup-blocked')) {
    return {
      kind: 'popup_blocked',
      userMessage:
        'Pop-up sign-in was blocked by your browser. Please allow pop-ups for this site and try again with Google.',
      shouldClearSession: false,
    };
  }

  if (
    haystack.includes('user-token-expired') ||
    haystack.includes('id-token-expired') ||
    haystack.includes('token-revoked') ||
    haystack.includes('user-disabled') ||
    haystack.includes('requires-recent-login') ||
    haystack.includes('unauthenticated')
  ) {
    return {
      kind: 'session_expired',
      userMessage:
        'Your Google sign-in session has expired or is no longer valid. Please sign in again.',
      shouldClearSession: true,
    };
  }

  if (
    haystack.includes('permission-denied') ||
    haystack.includes('missing or insufficient permissions') ||
    haystack.includes('unauthorized')
  ) {
    return {
      kind: 'unauthorized',
      userMessage:
        'Permission denied. Standard users can only view and manage their own data; admin moderation requires a verified Firebase admin custom claim.',
      shouldClearSession: false,
    };
  }

  if (haystack.includes('failed-precondition') || haystack.includes('requires an index')) {
    return {
      kind: 'missing_index',
      userMessage:
        'Required Firestore composite index (`feedback`: `userId` ASC, `createdAt` DESC) is not yet active on the database.',
      shouldClearSession: false,
    };
  }

  if (
    haystack.includes('network-request-failed') ||
    haystack.includes('unavailable') ||
    haystack.includes('offline')
  ) {
    return {
      kind: 'network',
      userMessage: 'Unable to reach Firebase authentication or Firestore. Check your connection.',
      shouldClearSession: false,
    };
  }

  return {
    kind: 'unknown',
    userMessage: message || 'An authentication or database error occurred.',
    shouldClearSession: false,
  };
}
