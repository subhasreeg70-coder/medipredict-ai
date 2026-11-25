import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DiseaseId, PredictionResult } from '../types/ml';

export interface UserProfileDoc {
  uid: string;
  displayName: string;
  email: string;
  role: 'learner';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StoredPredictionRecord {
  id: string;
  userId: string;
  diseaseId: DiseaseId;
  predictedClass: 0 | 1;
  predictedLabel: string;
  probability: number;
  riskTier: string;
  source: 'educational_demo_simulator' | 'python_sklearn_api';
  isTrainedModel: boolean;
  inputsSummary: Record<string, number>;
  createdAtMs: number;
}

export type FeedbackCategory = 'comment' | 'suggestion' | 'issue';
export type FeedbackModuleArea =
  | 'general'
  | 'heart'
  | 'diabetes'
  | 'breast-cancer'
  | 'datasets'
  | 'performance';
export type FeedbackStatus = 'new' | 'reviewed' | 'resolved';

export interface StoredFeedbackEntry {
  id: string;
  userId: string;
  userDisplayName: string;
  category: FeedbackCategory;
  moduleArea: FeedbackModuleArea;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAtMs: number;
  updatedAtMs: number;
}

function generateDocId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function sanitizeText(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export async function ensureUserProfile(user: User): Promise<UserProfileDoc> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = sanitizeText(user.displayName || user.email?.split('@')[0] || 'Learner', 80);
  const email = sanitizeText(user.email || 'unknown@example.com', 160);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const data = existingSnap.data() as UserProfileDoc;
      if (data.displayName !== displayName) {
        await updateDoc(ref, {
          displayName,
          updatedAt: serverTimestamp(),
        });
      }
      return { ...data, displayName };
    }

    const newProfile = {
      uid: user.uid,
      displayName,
      email,
      role: 'learner' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, newProfile);
    return {
      uid: user.uid,
      displayName,
      email,
      role: 'learner',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveUserPrediction(
  userId: string,
  result: PredictionResult,
  inputs: Record<string, number>
): Promise<string> {
  const predictionId = generateDocId('pred');
  const path = `users/${userId}/predictions/${predictionId}`;
  const ref = doc(db, 'users', userId, 'predictions', predictionId);

  // Enforce blueprint volumetric constraints (max 20 numeric summary keys)
  const inputsSummary: Record<string, number> = {};
  Object.entries(inputs)
    .slice(0, 20)
    .forEach(([k, v]) => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        inputsSummary[k.slice(0, 40)] = Number(v.toFixed(4));
      }
    });

  const payload = {
    id: predictionId,
    userId,
    diseaseId: result.diseaseId,
    predictedClass: result.predictedClass,
    predictedLabel: sanitizeText(result.predictedLabel, 120),
    probability: Math.min(1, Math.max(0, Number(result.probability))),
    riskTier: sanitizeText(result.riskTier, 80),
    source: result.source,
    isTrainedModel: Boolean(result.isTrainedModel),
    inputsSummary,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
    return predictionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserPredictions(
  userId: string,
  onData: (records: StoredPredictionRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/predictions`;
  const q = query(collection(db, 'users', userId, 'predictions'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoredPredictionRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const ts = raw.createdAt instanceof Timestamp ? raw.createdAt.toMillis() : Date.now();
        return {
          id: String(raw.id || d.id),
          userId: String(raw.userId || userId),
          diseaseId: raw.diseaseId as DiseaseId,
          predictedClass: raw.predictedClass === 1 ? 1 : 0,
          predictedLabel: String(raw.predictedLabel || ''),
          probability: Number(raw.probability ?? 0),
          riskTier: String(raw.riskTier || ''),
          source: raw.source,
          isTrainedModel: Boolean(raw.isTrainedModel),
          inputsSummary: (raw.inputsSummary as Record<string, number>) || {},
          createdAtMs: ts,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function deleteUserPrediction(userId: string, predictionId: string): Promise<void> {
  const path = `users/${userId}/predictions/${predictionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'predictions', predictionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function submitFeedbackEntry(params: {
  user: User;
  category: FeedbackCategory;
  moduleArea: FeedbackModuleArea;
  subject: string;
  message: string;
}): Promise<string> {
  if (!params.user.emailVerified) {
    throw new Error('A verified Google account email is required before submitting feedback.');
  }

  const feedbackId = generateDocId('fb');
  const path = `feedback/${feedbackId}`;
  const ref = doc(db, 'feedback', feedbackId);

  const subject = sanitizeText(params.subject, 120);
  const message = sanitizeText(params.message, 1500);
  if (subject.length < 3) {
    throw new Error('Subject must be at least 3 characters.');
  }
  if (message.length < 5) {
    throw new Error('Feedback message must be at least 5 characters.');
  }

  const userDisplayName = sanitizeText(
    params.user.displayName || params.user.email?.split('@')[0] || 'Learner',
    80
  );

  try {
    await setDoc(ref, {
      id: feedbackId,
      userId: params.user.uid,
      userDisplayName,
      category: params.category,
      moduleArea: params.moduleArea,
      subject,
      message,
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return feedbackId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeFeedbackEntries(
  user: User,
  isAdmin: boolean,
  onData: (entries: StoredFeedbackEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!user.emailVerified) {
    if (onError) {
      onError(new Error('Unverified email accounts cannot query Firestore feedback.'));
    }
    return () => {};
  }

  const path = 'feedback';
  const feedbackCol = collection(db, 'feedback');
  const q = isAdmin
    ? query(feedbackCol, orderBy('createdAt', 'desc'))
    : query(feedbackCol, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: StoredFeedbackEntry[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const createdAtMs =
          raw.createdAt instanceof Timestamp ? raw.createdAt.toMillis() : Date.now();
        const updatedAtMs =
          raw.updatedAt instanceof Timestamp ? raw.updatedAt.toMillis() : createdAtMs;
        return {
          id: String(raw.id || d.id),
          userId: String(raw.userId || ''),
          userDisplayName: String(raw.userDisplayName || 'Learner'),
          category: (raw.category as FeedbackCategory) || 'comment',
          moduleArea: (raw.moduleArea as FeedbackModuleArea) || 'general',
          subject: String(raw.subject || ''),
          message: String(raw.message || ''),
          status: (raw.status as FeedbackStatus) || 'new',
          createdAtMs,
          updatedAtMs,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<void> {
  const path = `feedback/${feedbackId}`;
  try {
    await updateDoc(doc(db, 'feedback', feedbackId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFeedbackEntry(feedbackId: string): Promise<void> {
  const path = `feedback/${feedbackId}`;
  try {
    await deleteDoc(doc(db, 'feedback', feedbackId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
