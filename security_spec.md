# MEDIPREDICT AI Firestore Security Specification

## 1. Data Invariants
1. **Owner-Only Profile & Prediction Isolation**: A user can only read, list, create, or delete documents under `/users/{userId}` and `/users/{userId}/predictions/{predictionId}` when `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Parent Existence (Master Gate)**: A prediction record under `/users/{userId}/predictions/{predictionId}` requires the parent `/users/{userId}` profile document to exist.
3. **No Privilege Escalation**: Users creating `/users/{userId}` may only set `role == 'learner'` and cannot modify `role`, `uid`, or `createdAt` after creation.
4. **Feedback Submission & Review**: Authenticated verified users may create feedback entries with `status == 'new'` and `userId == request.auth.uid`, and read/list only their own entries. Only an authenticated verified administrator carrying the trusted Firebase Auth custom claim (`request.auth.token.admin == true`) may list all feedback entries or update review `status` (`new` -> `reviewed` -> `resolved`).
5. **Server Timestamp Enforcement**: `createdAt` and `updatedAt` must strictly equal `request.time`.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. **Unauthenticated Prediction Write**: `request.auth == null` creating `/users/u1/predictions/p1` -> `PERMISSION_DENIED`.
2. **Cross-User Prediction Read**: `uid: u2` reading `/users/u1/predictions/p1` -> `PERMISSION_DENIED`.
3. **Cross-User Prediction List**: `uid: u2` listing `/users/u1/predictions` -> `PERMISSION_DENIED`.
4. **Identity Spoofing in Prediction**: `uid: u1` writing `userId: "u2"` inside `/users/u1/predictions/p1` -> `PERMISSION_DENIED`.
5. **Self-Assigned Admin Role**: `uid: u1` creating `/users/u1` with `role: "admin"` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection**: `uid: u1` creating `/users/u1/predictions/p1` with extra field `isClinicalApproved: true` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: `uid: u1` writing doc ID containing `../` or >128 chars -> `PERMISSION_DENIED`.
8. **Unverified Email / Spoofed Admin Claim**: `token.admin == true` with `email_verified: false`, or client-written `role: "admin"` without server-issued custom claim -> `PERMISSION_DENIED`.
9. **Feedback Status Bypass on Create**: `uid: u1` creating `/feedback/f1` with `status: "resolved"` -> `PERMISSION_DENIED`.
10. **Non-Admin Feedback Triage**: `uid: u1` updating `/feedback/f1` `status` to `"reviewed"` -> `PERMISSION_DENIED`.
11. **Backdated Timestamp Injection**: `uid: u1` creating `/feedback/f1` with client timestamp != `request.time` -> `PERMISSION_DENIED`.
12. **Resource Exhaustion Message**: `uid: u1` creating `/feedback/f1` with 10,000-char `message` -> `PERMISSION_DENIED`.
