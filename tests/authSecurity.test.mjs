import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  canModerateFeedback,
  canSubmitFeedback,
  canViewFeedbackEntry,
  classifyFirebaseError,
  resolveAuthSession,
} from '../src/services/authPolicy.ts';
import { runHeartDemoPrediction } from '../src/modules/heart/demoModel.ts';
import { runDiabetesDemoPrediction } from '../src/modules/diabetes/demoModel.ts';
import { runBreastCancerDemoPrediction } from '../src/modules/breastCancer/demoModel.ts';
import { heartFeatures } from '../src/modules/heart/schema.ts';
import { diabetesFeatures } from '../src/modules/diabetes/schema.ts';
import { breastCancerFeatures } from '../src/modules/breastCancer/schema.ts';

const ROOT = process.cwd();

test('[Unit/Mocked Auth Policy] resolveAuthSession enforces signed-out, unverified-email, normal user, and verified admin claim states', () => {
  // 1. Signed-out user
  const signedOut = resolveAuthSession(null, { admin: true });
  assert.deepEqual(signedOut, {
    status: 'signed_out',
    isAdmin: false,
    canAccessFirestore: false,
  });
  assert.equal(canSubmitFeedback(signedOut), false);
  assert.equal(canModerateFeedback(signedOut), false);
  assert.equal(canViewFeedbackEntry(signedOut, 'u1', 'u1'), false);

  // 2. Unverified email must never gain Firestore or admin access even if claim is true
  const unverified = resolveAuthSession(
    { uid: 'u-unverified', emailVerified: false },
    { admin: true }
  );
  assert.deepEqual(unverified, {
    status: 'unverified_email',
    isAdmin: false,
    canAccessFirestore: false,
  });
  assert.equal(canSubmitFeedback(unverified), false);
  assert.equal(canModerateFeedback(unverified), false);
  assert.equal(canViewFeedbackEntry(unverified, 'u-unverified', 'u-unverified'), false);

  // 3. Normal verified learner without admin custom claim
  const learner = resolveAuthSession({ uid: 'u-learner', emailVerified: true }, {});
  assert.deepEqual(learner, {
    status: 'authenticated',
    isAdmin: false,
    canAccessFirestore: true,
  });
  assert.equal(canSubmitFeedback(learner), true);
  assert.equal(canModerateFeedback(learner), false);

  // 4. Spoofed non-boolean admin claim (e.g., "true" string or client role) must be rejected
  const spoofedClaim = resolveAuthSession(
    { uid: 'u-spoof', emailVerified: true },
    { admin: 'true', role: 'admin' }
  );
  assert.equal(spoofedClaim.isAdmin, false);
  assert.equal(canModerateFeedback(spoofedClaim), false);

  // 5. Verified admin with trusted boolean custom claim
  const admin = resolveAuthSession(
    { uid: 'u-admin', emailVerified: true },
    { admin: true }
  );
  assert.deepEqual(admin, {
    status: 'authenticated',
    isAdmin: true,
    canAccessFirestore: true,
  });
  assert.equal(canModerateFeedback(admin), true);
});

test('[Unit/Mocked Auth Policy] user feedback ownership vs unauthorized admin access rules', () => {
  const userA = resolveAuthSession({ uid: 'user-a', emailVerified: true }, {});
  const admin = resolveAuthSession({ uid: 'admin-1', emailVerified: true }, { admin: true });

  // Normal user can only view own feedback, never another user's feedback, and never moderate
  assert.equal(canViewFeedbackEntry(userA, 'user-a', 'user-a'), true);
  assert.equal(canViewFeedbackEntry(userA, 'user-a', 'user-b'), false);
  assert.equal(canModerateFeedback(userA), false);

  // Unauthorized learner cannot escalate to admin moderation even if targeting own feedback
  assert.equal(canModerateFeedback(resolveAuthSession({ uid: 'user-a', emailVerified: true }, { admin: 1 })), false);

  // Admin with verified custom claim can view and moderate all entries
  assert.equal(canViewFeedbackEntry(admin, 'admin-1', 'user-a'), true);
  assert.equal(canViewFeedbackEntry(admin, 'admin-1', 'user-b'), true);
  assert.equal(canModerateFeedback(admin), true);
});

test('[Unit/Mocked Auth Policy] classifyFirebaseError handles expired-session, unauthorized, unwrapping JSON errors, and popup states', () => {
  const expired = classifyFirebaseError({ code: 'auth/user-token-expired', message: 'Expired' });
  assert.equal(expired.kind, 'session_expired');
  assert.equal(expired.shouldClearSession, true);

  const wrappedPermDenied = classifyFirebaseError(
    new Error(
      JSON.stringify({
        error: '7 PERMISSION_DENIED: Missing or insufficient permissions.',
        operationType: 'list',
        path: 'feedback',
      })
    )
  );
  assert.equal(wrappedPermDenied.kind, 'unauthorized');
  assert.equal(wrappedPermDenied.shouldClearSession, false);
  assert.ok(!wrappedPermDenied.userMessage.startsWith('{'));

  const wrappedUnauth = classifyFirebaseError(
    new Error(
      JSON.stringify({
        error: '16 UNAUTHENTICATED: Request had invalid authentication credentials.',
        operationType: 'get',
        path: 'users/u1',
      })
    )
  );
  assert.equal(wrappedUnauth.kind, 'session_expired');
  assert.equal(wrappedUnauth.shouldClearSession, true);

  const missingIndex = classifyFirebaseError(
    new Error('FAILED_PRECONDITION: The query requires an index.')
  );
  assert.equal(missingIndex.kind, 'missing_index');

  const popupClosed = classifyFirebaseError({ code: 'auth/popup-closed-by-user', message: 'Closed' });
  assert.equal(popupClosed.kind, 'popup_closed');
});

test('[Static Verification] firestore.rules, indexes config, and client auth contain zero hardcoded admin emails or leaked secrets', () => {
  const rulesText = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  const authContextText = fs.readFileSync(path.join(ROOT, 'src/context/AuthContext.tsx'), 'utf8');
  const firestoreServiceText = fs.readFileSync(
    path.join(ROOT, 'src/services/firestoreService.ts'),
    'utf8'
  );
  const indexesJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'firestore.indexes.json'), 'utf8')
  );

  // No hardcoded admin email anywhere in client auth/service or Firestore rules
  assert.equal(rulesText.includes('subhasreeg70@gmail.com'), false);
  assert.equal(authContextText.includes('subhasreeg70@gmail.com'), false);
  assert.equal(firestoreServiceText.includes('subhasreeg70@gmail.com'), false);
  assert.equal(firestoreServiceText.includes('ADMIN_EMAIL'), false);

  // Server-side rules enforce default deny, email verification, custom claim admin, and ownership
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rulesText, /request\.auth != null && request\.auth\.token\.email_verified == true/);
  assert.match(
    rulesText,
    /function isAdmin\(\) \{\s*return isSignedIn\(\) && request\.auth\.token\.admin == true;\s*\}/
  );
  assert.match(
    rulesText,
    /allow list: if isAdmin\(\) \|\| \(isSignedIn\(\) && resource\.data\.userId == request\.auth\.uid\);/
  );
  assert.match(
    rulesText,
    /allow update:[\s\S]*?isAdmin\(\)[\s\S]*?hasOnly\(\['status', 'updatedAt'\]\)/
  );
  assert.match(rulesText, /data\.role is string && data\.role == 'learner'/);

  // Composite feedback index configuration matches query (userId ASC, createdAt DESC)
  assert.deepEqual(indexesJson.indexes[0], {
    collectionGroup: 'feedback',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  });
});

test('[Model Integrity] frontend schemas match saved model featureOrder and demo formulas stay clearly labeled non-trained', () => {
  const heartMetrics = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'python_backend/saved_models/heart_metrics.json'), 'utf8')
  );
  const diabetesMetrics = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'python_backend/saved_models/diabetes_metrics.json'), 'utf8')
  );
  const bcMetrics = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'python_backend/saved_models/breast_cancer_metrics.json'),
      'utf8'
    )
  );

  assert.deepEqual(
    heartFeatures.map((f) => f.key),
    heartMetrics.featureOrder
  );
  assert.deepEqual(
    diabetesFeatures.map((f) => f.key),
    diabetesMetrics.featureOrder
  );
  assert.deepEqual(
    breastCancerFeatures.map((f) => f.key),
    bcMetrics.featureOrder
  );

  const demoRuns = [
    runHeartDemoPrediction({}),
    runDiabetesDemoPrediction({}),
    runBreastCancerDemoPrediction({}),
  ];

  for (const res of demoRuns) {
    assert.equal(res.isTrainedModel, false);
    assert.equal(res.source, 'educational_demo_simulator');
    assert.match(res.predictedLabel, /^Demo Class/);
  }
});
