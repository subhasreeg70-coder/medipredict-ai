# MediPredict AI — Production Readiness & Deployment Guide

This guide documents the remaining manual Firebase Console / Cloud Shell tasks, authentication verification checklist, and runtime operational configuration required outside the local sandbox.

---

## 1. Firestore Composite Index Deployment

`firebase.json` and `firestore.indexes.json` define the composite index required by the non-admin learner feedback history query in `src/services/firestoreService.ts` (`where('userId', '==', user.uid)` + `orderBy('createdAt', 'desc')`):

- **Project ID:** `apt-axe-bk4jk`
- **Database ID:** `ai-studio-medipredictai-fc054049-129d-4f6b-b77b-5669624e65e3`
- **Collection Group:** `feedback`
- **Query Scope:** `COLLECTION`
- **Fields:**
  1. `userId` — `ASCENDING`
  2. `createdAt` — `DESCENDING`

### Manual Firebase Console Steps (Required When CLI Auth Is Unavailable)

1. Open the [Firebase Console](https://console.firebase.google.com/) and select project **`apt-axe-bk4jk`**.
2. Go to **Build → Firestore Database** and select database **`ai-studio-medipredictai-fc054049-129d-4f6b-b77b-5669624e65e3`**.
3. Open the **Indexes → Composite** tab and click **Add Index** (or **Create Index**).
4. Set **Collection ID** to `feedback`.
5. Add field **`userId`** with order **Ascending**.
6. Add field **`createdAt`** with order **Descending**.
7. Set **Query scope** to **Collection** and click **Create**.
8. Wait until the index status transitions from **Building** to **Enabled**.

### Authorized Firebase CLI Deployment (Alternative for Project Owners)

```bash
firebase login
firebase deploy --only firestore:indexes --project apt-axe-bk4jk
```

> Verify deployment status with:
> `firebase firestore:indexes --project apt-axe-bk4jk --database ai-studio-medipredictai-fc054049-129d-4f6b-b77b-5669624e65e3`

---

## 2. Secure Admin Custom Claims Provisioning (`{ "admin": true }`)

`firestore.rules` (`isAdmin()`) and `src/services/authPolicy.ts` (`resolveAuthSession()`) enforce admin privileges strictly from a verified Firebase Auth custom claim (`request.auth.token.admin == true` combined with `request.auth.token.email_verified == true`). Client code never checks email strings, never accepts client-supplied role fields, and never commits credentials or service-account keys.

### Cloud Shell / Local Application Default Credentials (No Key Files)

Run this script from **Google Cloud Shell** (under the Firebase project owner account) or a trusted maintainer workstation authenticated via `gcloud auth application-default login` — never generate or commit service-account JSON key files:

```javascript
// Run in Cloud Shell or locally with Application Default Credentials (no service-account key files).
// Requires: npm install firebase-admin
import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: applicationDefault(),
      projectId: 'apt-axe-bk4jk',
    });

async function grantAdminClaim(targetUid) {
  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error('Provide the target Firebase Auth UID.');
  }

  const auth = getAuth(app);
  const userRecord = await auth.getUser(targetUid);

  if (!userRecord.emailVerified) {
    throw new Error('Refusing admin claim for an account without a verified email.');
  }

  // Preserve all existing custom claims while adding admin: true
  const existingClaims = userRecord.customClaims ?? {};
  await auth.setCustomUserClaims(targetUid, {
    ...existingClaims,
    admin: true,
  });

  console.log(`Updated custom claims for UID ${targetUid}:`, {
    ...existingClaims,
    admin: true,
  });
}

// Pass UID at runtime via environment variable or CLI argument:
// TARGET_UID="<firebase-auth-uid>" node grant-admin.mjs
await grantAdminClaim(process.env.TARGET_UID);
```

### How the Admin User Refreshes Their Authentication Token

Firebase ID tokens cache custom claims until the token refreshes (up to 1 hour) or is explicitly forced to refresh:

1. Sign in with Google in MediPredict AI.
2. Open the Account session modal (click the account/session control or **Sign In with Google** → **Account Session**).
3. Click **Refresh Token** (`refreshSession()` calls `auth.currentUser.getIdTokenResult(true)`), **or** click **Log Out** and sign in again with Google.
4. Confirm the session badge updates from **Verified Learner** to **Verified Admin Claim**, and the Feedback view switches to **All Feedback Entries (Admin Review Queue)**.

> **Starter Tier / IAM Note:** If `apt-axe-bk4jk` is a Google-hosted Starter Tier project without user-managed IAM, `firebase-admin` user management (`getUser` / `setCustomUserClaims`) requires either running as the authorized project owner after upgrading to a standard Cloud project or assigning `roles/firebaseauth.admin` on an owner-managed project. `firestore.rules` remains fail-closed (`admin == true` denied by default) until the claim is issued.

---

## 3. Firebase Authentication & Authorization Verification Checklist

Run these manual checks in a live browser after deploying the composite index and provisioning an admin claim:

- [ ] **Google Sign-In:** Click **Sign In with Google** → **Continue with Google**; verify popup sign-in succeeds, only Google Sign-In is presented, and `/users/{uid}` is created with `role: "learner"`.
- [ ] **Email Verification Enforcement:** Verify unverified accounts (`emailVerified === false`) are blocked by both `AuthContext` (`authStatus === 'unverified_email'`) and `firestore.rules` (`isSignedIn()`), and cannot read or write predictions or feedback.
- [ ] **Normal Learner Permissions:** Sign in as a standard verified Google account (without `{ admin: true }`):
  - Can run and save predictions under `/users/{ownUid}/predictions/{id}`.
  - Cannot read/write another user's `/users/{otherUid}` or `/users/{otherUid}/predictions`.
  - Cannot update `role` to `'admin'` on `/users/{ownUid}` (`PERMISSION_DENIED`).
- [ ] **Feedback Submission (Learner):** Submit a feedback entry on **Feedback & Review**; verify it is created with `status: "new"` and `userId == ownUid`.
- [ ] **Feedback History Retrieval (Learner):** Confirm **My Submitted Feedback (Private to Your Account)** displays only the signed-in learner's own entries ordered newest-first (confirms the `feedback` composite index is `Enabled`), and no status-triage dropdown appears.
- [ ] **Admin Permissions & Token Refresh:** Issue `{ admin: true }` to a test admin UID, click **Refresh Token** in `AuthModal`, and verify the badge changes to **Verified Admin Claim**.
- [ ] **Admin Feedback Management:** Confirm **All Feedback Entries (Admin Review Queue)** lists entries across users and changing status (`New` → `Reviewed` → `Resolved`) persists in Firestore, while attempting the same status update from a non-admin session is denied by `firestore.rules`.

---

## 4. FastAPI Backend Security & Operational Notes

`python_backend/app.py` configures:

- **Request Size Limit (`RequestSizeLimitMiddleware`):** `MAX_PREDICT_BODY_BYTES` (default `16384` bytes). Oversized JSON payloads return HTTP `413` with JSON `{"detail": "..."}`.
- **In-Memory Prediction Rate Limiter (`SlidingWindowRateLimiter`):** `RATE_LIMIT_MAX_REQUESTS` (default `60`) per `RATE_LIMIT_WINDOW_SECONDS` (default `60`) per client IP on `POST /api/predict/*`, returning HTTP `429` with `Retry-After`.
  - **Multi-worker / Multi-instance Limitation:** Rate-limit buckets live in process-local memory. If deploying multiple `uvicorn --workers` or multiple container replicas, enforce global rate limiting at an API gateway, reverse proxy (e.g., Nginx/Cloudflare), or shared Redis store.
- **Strict Payload Validation:** Rejects `extra` top-level keys, missing or unexpected feature keys, booleans, strings, `null`, `NaN`, `Infinity`/`-Infinity`, and out-of-range inputs with HTTP `422`.
- **Non-PHI Logging & Safe 500 Handling:** Request logs record HTTP method, path, status code, and latency only—never clinical feature values. Unexpected internal errors return HTTP `500` without exposing stack traces.
